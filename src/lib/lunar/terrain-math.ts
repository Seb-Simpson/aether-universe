import type { LunarManifest, TileAddress } from "./types";

/** Heights remain measured metres relative to the product's radius datum.
 * The local display origin removes the mean elevation and spherical sagitta.
 */
export function lunarSagitta(x: number, z: number, radius: number): number {
  return radius - Math.sqrt(Math.max(0, radius * radius - x * x - z * z));
}
export function sampleGrid(
  grid: Float32Array,
  size: number,
  u: number,
  v: number,
): number {
  const gx = Math.max(0, Math.min(size - 1, u * (size - 1))),
    gy = Math.max(0, Math.min(size - 1, v * (size - 1)));
  const x = Math.floor(gx),
    y = Math.floor(gy),
    nx = Math.min(size - 1, x + 1),
    ny = Math.min(size - 1, y + 1);
  const tx = gx - x,
    ty = gy - y;
  const a = grid[y * size + x],
    b = grid[y * size + nx],
    c = grid[ny * size + x],
    d = grid[ny * size + nx];
  if (![a, b, c, d].every(Number.isFinite)) return NaN;
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}
export function terrainElevation(
  grid: Float32Array,
  manifest: LunarManifest,
  x: number,
  z: number,
): number {
  const half = manifest.sizeMeters / 2;
  const h = sampleGrid(
    grid,
    manifest.gridSize,
    (x + half) / manifest.sizeMeters,
    (z + half) / manifest.sizeMeters,
  );
  return (
    h - manifest.referenceElevation - lunarSagitta(x, z, manifest.radiusMeters)
  );
}
/** Same triangular interpolation as the mesh: NW/SW/NE and NE/SW/SE.
 * The fine source sampler is also consulted for conservative ground clearance.
 */
export function coarseTerrainElevation(
  grid: Float32Array,
  m: LunarManifest,
  x: number,
  z: number,
  level: number,
): number {
  const cells = (m.tileGridSize - 1) * 2 ** level,
    step = m.sizeMeters / cells,
    half = m.sizeMeters / 2;
  const gx = Math.max(0, Math.min(cells - 1e-8, (x + half) / step));
  const gz = Math.max(0, Math.min(cells - 1e-8, (z + half) / step));
  const ix = Math.floor(gx),
    iz = Math.floor(gz),
    fx = gx - ix,
    fz = gz - iz;
  const at = (dx: number, dz: number) =>
    terrainElevation(
      grid,
      m,
      -half + (ix + dx) * step,
      -half + (iz + dz) * step,
    );
  const a = at(0, 0),
    b = at(1, 0),
    c = at(0, 1),
    d = at(1, 1);
  return fx + fz <= 1
    ? a + (b - a) * fx + (c - a) * fz
    : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}
export function tileBounds(m: LunarManifest, t: TileAddress) {
  const size = m.sizeMeters / 2 ** t.level,
    half = m.sizeMeters / 2;
  return { x: -half + t.x * size, z: -half + t.y * size, size };
}
/** Projected sample-spacing budget. Child tiles supply additional measured
 * source samples; no image-derived height or synthetic noise is generated.
 */
export function desiredTerrainTiles(
  m: LunarManifest,
  position: { x: number; y: number; z: number },
  height: number,
  fov: number,
  mobile: boolean,
): TileAddress[] {
  const result: TileAddress[] = [];
  const pixelBudget = mobile ? 7 : 5;
  const visit = (t: TileAddress) => {
    const b = tileBounds(m, t);
    const dx = Math.max(b.x - position.x, 0, position.x - (b.x + b.size));
    const dz = Math.max(b.z - position.z, 0, position.z - (b.z + b.size));
    const distance = Math.max(200, Math.hypot(dx, dz, Math.max(0, position.y)));
    const spacing = b.size / (m.tileGridSize - 1);
    const error =
      (spacing * 0.12 * height) /
      (2 * Math.tan((fov * Math.PI) / 360) * distance);
    if (t.level < m.maxLevel && error > pixelBudget) {
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++)
          visit({ level: t.level + 1, x: t.x * 2 + x, y: t.y * 2 + y });
    } else result.push(t);
  };
  visit({ level: 0, x: 0, y: 0 });
  return result;
}
export function parentKeys(tiles: TileAddress[]): string[] {
  const keys = new Set<string>(["0/0/0"]);
  for (const t of tiles)
    for (let level = 0; level <= t.level; level++) {
      const divisor = 2 ** (t.level - level);
      keys.add(
        `${level}/${Math.floor(t.x / divisor)}/${Math.floor(t.y / divisor)}`,
      );
    }
  return [...keys];
}

/** Conservative collision envelope covers the measured mesh and every parent
 * fallback, including the sampled segment between consecutive flight poses. */
export function collisionElevation(
  grid: Float32Array,
  m: LunarManifest,
  x: number,
  z: number,
): number {
  let height = terrainElevation(grid, m, x, z);
  for (let level = 0; level <= m.maxLevel; level++)
    height = Math.max(height, coarseTerrainElevation(grid, m, x, z, level));
  return height;
}
export function sweptGroundHeight(
  grid: Float32Array,
  m: LunarManifest,
  from: { x: number; z: number },
  to: { x: number; z: number },
): number {
  const distance = Math.hypot(to.x - from.x, to.z - from.z),
    spacing = m.sizeMeters / (m.gridSize - 1);
  const count = Math.max(1, Math.ceil(distance / (spacing * 0.5)));
  let height = -Infinity;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    height = Math.max(
      height,
      collisionElevation(
        grid,
        m,
        from.x + (to.x - from.x) * t,
        from.z + (to.z - from.z) * t,
      ),
    );
  }
  return height;
}
