/** Bounded, abortable cache for static terrain assets. The renderer retains
 * ancestors in its wanted set and draws the nearest resident parent while a
 * child is loading. Values own their GPU/CPU cleanup through dispose(). */
export interface TilePayload<T> {
  value: T;
  bytes: number;
}
export interface TerrainTileCacheOptions<T> {
  load: (key: string, signal: AbortSignal) => Promise<TilePayload<T>>;
  dispose: (value: T) => void;
  maxBytes: number;
  maxEntries?: number;
  maxConcurrent?: number;
  pinned?: Iterable<string>;
  onChange?: () => void;
}
interface Entry<T> extends TilePayload<T> {
  used: number;
}
interface Job<T> {
  key: string;
  controller: AbortController;
  cancelled: boolean;
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}
export class TileRequestCancelledError extends Error {
  constructor(key: string) {
    super(`Terrain tile request cancelled: ${key}`);
    this.name = "AbortError";
  }
}

export class TerrainTileCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly jobs = new Map<string, Job<T>>();
  private readonly running = new Set<Job<T>>();
  private readonly queue: Job<T>[] = [];
  private readonly pinned: Set<string>;
  private wanted: Set<string>;
  private readonly maxEntries: number;
  private readonly maxConcurrent: number;
  private bytes = 0;
  private clock = 0;
  private closed = false;
  private counts = { requests: 0, evictions: 0, cancelled: 0, errors: 0 };

  constructor(private readonly options: TerrainTileCacheOptions<T>) {
    this.maxEntries = options.maxEntries ?? 128;
    this.maxConcurrent = options.maxConcurrent ?? 4;
    if (
      !Number.isFinite(options.maxBytes) ||
      options.maxBytes <= 0 ||
      !Number.isInteger(this.maxEntries) ||
      this.maxEntries < 1 ||
      !Number.isInteger(this.maxConcurrent) ||
      this.maxConcurrent < 1
    )
      throw new RangeError(
        "Terrain cache budgets must be positive finite values",
      );
    this.pinned = new Set(options.pinned);
    this.wanted = new Set(this.pinned);
  }

  get stats() {
    return {
      ...this.counts,
      pending: this.running.size,
      queued: this.queue.filter((job) => !job.cancelled).length,
      resident: this.entries.size,
      bytes: this.bytes,
    };
  }

  /** Reading a value updates LRU usage; it does not allocate or fetch. */
  peek(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (entry) entry.used = ++this.clock;
    return entry?.value;
  }

  /** Existing data is immediately reusable. Duplicate in-flight requests share
   * one promise. A failed/cancelled key may be requested again. */
  request(key: string): Promise<T> {
    if (this.closed)
      return this.rejected(new Error("Terrain cache is disposed"));
    this.wanted.add(key);
    const entry = this.entries.get(key);
    if (entry) {
      entry.used = ++this.clock;
      return Promise.resolve(entry.value);
    }
    const existing = this.jobs.get(key);
    if (existing) return existing.promise;
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    // The caller still receives rejection; this handler prevents ignored
    // speculative terrain requests becoming unhandled promise rejections.
    void promise.catch(() => undefined);
    const job: Job<T> = {
      key,
      promise,
      resolve,
      reject,
      controller: new AbortController(),
      cancelled: false,
    };
    this.jobs.set(key, job);
    this.queue.push(job);
    this.drain();
    return promise;
  }

  /** Apply the current visibility generation. Running stale fetches abort;
   * late completions are disposed instead of entering the resident cache. */
  setWanted(keys: Iterable<string>) {
    if (this.closed) return;
    this.wanted = new Set([...this.pinned, ...keys]);
    for (const job of this.jobs.values()) {
      if (!this.wanted.has(job.key)) this.cancel(job);
    }
    this.drain();
    this.notify();
  }

  clear() {
    for (const job of Array.from(this.jobs.values())) this.cancel(job);
    this.queue.length = 0;
    for (const entry of this.entries.values())
      this.options.dispose(entry.value);
    this.entries.clear();
    this.bytes = 0;
    this.wanted = new Set(this.pinned);
    this.notify();
  }

  dispose() {
    if (this.closed) return;
    this.closed = true;
    this.clear();
  }

  private rejected(error: Error): Promise<T> {
    const promise = Promise.reject<T>(error);
    void promise.catch(() => undefined);
    return promise;
  }
  private notify() {
    if (!this.closed) this.options.onChange?.();
  }
  private cancel(job: Job<T>) {
    if (job.cancelled) return;
    job.cancelled = true;
    job.controller.abort();
    job.reject(new TileRequestCancelledError(job.key));
    this.counts.cancelled++;
    if (this.jobs.get(job.key) === job) this.jobs.delete(job.key);
  }
  private makeRoom(bytes: number): boolean {
    if (bytes > this.options.maxBytes) return false;
    while (
      this.entries.size + 1 > this.maxEntries ||
      this.bytes + bytes > this.options.maxBytes
    ) {
      let candidate: [string, Entry<T>] | undefined;
      for (const item of this.entries) {
        if (this.pinned.has(item[0])) continue;
        if (
          !candidate ||
          (this.wanted.has(candidate[0]) && !this.wanted.has(item[0])) ||
          (this.wanted.has(candidate[0]) === this.wanted.has(item[0]) &&
            item[1].used < candidate[1].used)
        )
          candidate = item;
      }
      if (!candidate) return false;
      this.entries.delete(candidate[0]);
      this.bytes -= candidate[1].bytes;
      this.options.dispose(candidate[1].value);
      this.counts.evictions++;
    }
    return true;
  }
  private drain() {
    if (this.closed) return;
    while (this.running.size < this.maxConcurrent && this.queue.length) {
      const job = this.queue.shift()!;
      if (job.cancelled) continue;
      this.running.add(job);
      this.counts.requests++;
      // Keep cancelled jobs counted until the loader settles, so even a
      // misbehaving loader cannot exceed the configured concurrent budget.
      void Promise.resolve()
        .then(() => {
          if (job.cancelled) throw new TileRequestCancelledError(job.key);
          return this.options.load(job.key, job.controller.signal);
        })
        .then((payload) => {
          if (
            job.cancelled ||
            this.closed ||
            this.jobs.get(job.key) !== job ||
            !this.wanted.has(job.key)
          ) {
            this.options.dispose(payload.value);
            return;
          }
          if (
            !Number.isFinite(payload.bytes) ||
            payload.bytes < 0 ||
            !this.makeRoom(payload.bytes)
          ) {
            this.options.dispose(payload.value);
            throw new RangeError(
              `Terrain tile cannot fit cache budget: ${job.key}`,
            );
          }
          this.entries.set(job.key, { ...payload, used: ++this.clock });
          this.bytes += payload.bytes;
          job.resolve(payload.value);
        })
        .catch((error) => {
          if (!job.cancelled) {
            this.counts.errors++;
            if (this.jobs.get(job.key) === job) this.jobs.delete(job.key);
            job.reject(error);
          }
        })
        .finally(() => {
          this.running.delete(job);
          if (this.jobs.get(job.key) === job) this.jobs.delete(job.key);
          this.notify();
          this.drain();
        })
        .catch(() => undefined);
    }
    this.notify();
  }
}
