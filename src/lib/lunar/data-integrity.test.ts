import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { makeTerrainGeometry } from "./geometry";
import { terrainElevation } from "./terrain-math";
import type { LunarManifest } from "./types";
const manifest = JSON.parse(
  readFileSync("public/lunar/manifest.json", "utf8"),
) as LunarManifest & { heightSha256: string; noDataCount: number };
const bytes = readFileSync("public/lunar/heights.bin");
const grid = new Float32Array(
  bytes.buffer,
  bytes.byteOffset,
  bytes.byteLength / 4,
);
describe("bundled measured lunar region", () => {
  it("preserves the documented measured grid and datum range", () => {
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      manifest.heightSha256,
    );
    expect(grid.length).toBe(1025 ** 2);
    expect(grid.every(Number.isFinite)).toBe(true);
    expect(manifest.noDataCount).toBe(0);
    expect(Math.min(...grid.slice(0, 1025))).toBeGreaterThan(-10000);
    expect(manifest.maxElevation - manifest.minElevation).toBeGreaterThan(3800);
  });
  it("all tile samples are nested measured grid values with exact shared borders", () => {
    for (let level = 0; level <= 4; level++)
      for (let y = 0; y < 2 ** level; y++)
        for (let x = 0; x < 2 ** level; x++) {
          const file = readFileSync(
              `public/lunar/tiles/${level}/${x}/${y}.bin`,
            ),
            samples = new Float32Array(
              file.buffer,
              file.byteOffset,
              file.byteLength / 4,
            ),
            stride = 16 / 2 ** level;
          expect(samples.length).toBe(65 ** 2);
          for (let z = 0; z < 65; z++)
            for (let i = 0; i < 65; i++) {
              if (
                samples[z * 65 + i] !==
                grid[
                  (y * 64 * stride + z * stride) * 1025 +
                    x * 64 * stride +
                    i * stride
                ]
              )
                throw new Error(
                  `Non-nested source sample at ${level}/${x}/${y}:${i},${z}`,
                );
            }
        }
  });
  it("displaces real geometry by the DEM, retaining a parent morph and seam skirts", () => {
    const file = readFileSync("public/lunar/tiles/0/0/0.bin"),
      samples = new Float32Array(
        file.buffer,
        file.byteOffset,
        file.byteLength / 4,
      );
    const geometry = makeTerrainGeometry(
      manifest,
      grid,
      { level: 0, x: 0, y: 0 },
      samples,
    );
    for (const index of [0, 32, 65 * 32 + 32, 65 * 64 + 64]) {
      const x = geometry.attributes.position.getX(index),
        z = geometry.attributes.position.getZ(index);
      expect(geometry.attributes.position.getY(index)).toBeCloseTo(
        terrainElevation(grid, manifest, x, z),
        2,
      );
    }
    expect(geometry.attributes.parentY.count).toBe(
      geometry.attributes.position.count,
    );
    expect(geometry.attributes.isSkirt.count).toBe(
      geometry.attributes.position.count,
    );
    geometry.dispose();
  });
  it("shared edges have identical DEM-apron normals, independent of skirts", () => {
    const geometryAt = (x: number) => {
      const b = readFileSync(`public/lunar/tiles/2/${x}/1.bin`);
      return makeTerrainGeometry(
        manifest,
        grid,
        { level: 2, x, y: 1 },
        new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4),
      );
    };
    const west = geometryAt(1),
      east = geometryAt(2);
    for (let row = 0; row < 65; row++) {
      const a = row * 65 + 64,
        b = row * 65;
      for (let axis = 0; axis < 3; axis++)
        expect(west.attributes.normal.getComponent(a, axis)).toBeCloseTo(
          east.attributes.normal.getComponent(b, axis),
          6,
        );
      expect(west.attributes.normal.getY(a)).toBeGreaterThan(0);
    }
    west.dispose();
    east.dispose();
  });
});
