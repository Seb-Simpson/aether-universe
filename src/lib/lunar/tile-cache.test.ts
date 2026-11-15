import { describe, expect, it, vi } from "vitest";
import { TerrainTileCache } from "./tile-cache";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("bounded static terrain tile cache", () => {
  it("shares in-flight requests, enforces concurrency, and retries failed requests", async () => {
    const waiting = new Map<
      string,
      (value: { value: string; bytes: number }) => void
    >();
    const load = vi.fn(
      (key: string) =>
        new Promise<{ value: string; bytes: number }>((resolve) =>
          waiting.set(key, resolve),
        ),
    );
    const cache = new TerrainTileCache({
      load,
      dispose: vi.fn(),
      maxBytes: 100,
      maxConcurrent: 1,
    });
    const a = cache.request("a");
    expect(cache.request("a")).toBe(a);
    const b = cache.request("b");
    await tick();
    expect(load).toHaveBeenCalledTimes(1);
    expect(cache.stats).toMatchObject({ pending: 1, queued: 1 });
    waiting.get("a")!({ value: "a", bytes: 10 });
    expect(await a).toBe("a");
    await tick();
    expect(load).toHaveBeenCalledTimes(2);
    waiting.get("b")!({ value: "b", bytes: 10 });
    expect(await b).toBe("b");
    cache.dispose();

    let attempts = 0;
    const retry = new TerrainTileCache({
      load: async () => {
        if (++attempts === 1) throw new Error("offline");
        return { value: "ready", bytes: 1 };
      },
      dispose: vi.fn(),
      maxBytes: 10,
    });
    await expect(retry.request("tile")).rejects.toThrow("offline");
    expect(await retry.request("tile")).toBe("ready");
    retry.dispose();
  });

  it("aborts stale work and disposes ignored late completions", async () => {
    let finish!: (payload: { value: string; bytes: number }) => void;
    let signal!: AbortSignal;
    const dispose = vi.fn();
    const cache = new TerrainTileCache({
      load: async (_key, received) => {
        signal = received;
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
      dispose,
      maxBytes: 100,
    });
    const obsolete = cache.request("old");
    await tick();
    cache.setWanted([]);
    expect(signal.aborted).toBe(true);
    await expect(obsolete).rejects.toMatchObject({ name: "AbortError" });
    finish({ value: "stale GPU resource", bytes: 10 });
    await tick();
    expect(dispose).toHaveBeenCalledWith("stale GPU resource");
    expect(cache.stats.resident).toBe(0);
    expect(cache.stats.cancelled).toBe(1);
    cache.dispose();
  });

  it("retains a pinned parent and evicts least-recently-used children within byte and entry budgets", async () => {
    const dispose = vi.fn();
    const cache = new TerrainTileCache({
      load: async (key) => ({ value: key, bytes: 10 }),
      dispose,
      maxBytes: 30,
      maxEntries: 3,
      pinned: ["root"],
    });
    for (const key of ["root", "a", "b"]) await cache.request(key);
    cache.peek("a");
    await cache.request("c");
    expect(cache.peek("root")).toBe("root");
    expect(cache.peek("a")).toBe("a");
    expect(cache.peek("b")).toBeUndefined();
    expect(dispose).toHaveBeenCalledWith("b");
    expect(cache.stats).toMatchObject({ resident: 3, bytes: 30, evictions: 1 });
    cache.dispose();
    expect(dispose.mock.calls.flat().sort()).toEqual(
      ["root", "a", "b", "c"].sort(),
    );
  });

  it("rejects an oversized tile rather than exceeding the resident budget", async () => {
    const dispose = vi.fn();
    const cache = new TerrainTileCache({
      load: async () => ({ value: "oversized", bytes: 101 }),
      dispose,
      maxBytes: 100,
    });
    await expect(cache.request("large")).rejects.toThrow("cannot fit");
    expect(cache.stats.bytes).toBe(0);
    expect(dispose).toHaveBeenCalledWith("oversized");
    cache.dispose();
    await expect(cache.request("after-dispose")).rejects.toThrow("disposed");
  });
  it("cancels queued requests without starting a fetch and stops notifications after disposal", async () => {
    let finish!: (value: { value: string; bytes: number }) => void;
    const load = vi.fn(
      () =>
        new Promise<{ value: string; bytes: number }>((resolve) => {
          finish = resolve;
        }),
    );
    const dispose = vi.fn(),
      onChange = vi.fn();
    const cache = new TerrainTileCache({
      load,
      dispose,
      onChange,
      maxBytes: 100,
      maxConcurrent: 1,
    });
    const active = cache.request("active"),
      queued = cache.request("queued");
    await tick();
    cache.setWanted(["active"]);
    await expect(queued).rejects.toMatchObject({ name: "AbortError" });
    expect(load).toHaveBeenCalledTimes(1);
    cache.dispose();
    const notifications = onChange.mock.calls.length;
    await expect(active).rejects.toMatchObject({ name: "AbortError" });
    finish({ value: "late", bytes: 10 });
    await tick();
    expect(dispose).toHaveBeenCalledWith("late");
    expect(onChange).toHaveBeenCalledTimes(notifications);
    expect(cache.stats).toMatchObject({
      resident: 0,
      bytes: 0,
      pending: 0,
      queued: 0,
    });
  });
});
