import { describe, it, expect } from "vitest";
import {
  coarseTerrainElevation,
  sweptGroundHeight,
  collisionElevation,
  desiredTerrainTiles,
  lunarSagitta,
  sampleGrid,
  terrainElevation,
} from "./terrain-math";
import type { LunarManifest } from "./types";
const manifest: LunarManifest = {
  centerLat: 23.7,
  centerLon: 312.5,
  sizeMeters: 60000,
  radiusMeters: 1737400,
  gridSize: 5,
  minElevation: 0,
  maxElevation: 100,
  referenceElevation: 0,
  sourceResolutionMeters: 60,
  maxLevel: 4,
  tileGridSize: 65,
  heightUrl: "heights.bin",
  tileTemplate: "",
  textureTemplate: "",
  regionTextureUrl: "",
};
describe("measured lunar terrain geometry policy", () => {
  it("interpolates actual height samples and preserves no-data as invalid", () => {
    expect(sampleGrid(new Float32Array([0, 20, 40, 60]), 2, 0.5, 0.5)).toBe(30);
    expect(
      sampleGrid(new Float32Array([0, NaN, 40, 60]), 2, 0.5, 0.5),
    ).toBeNaN();
  });
  it("accounts for lunar curvature in the local metre frame", () => {
    expect(lunarSagitta(0, 0, 1737400)).toBe(0);
    expect(lunarSagitta(30000, 0, 1737400)).toBeGreaterThan(250);
    const grid = new Float32Array(25).fill(100);
    expect(terrainElevation(grid, manifest, 0, 0)).toBe(100);
    expect(terrainElevation(grid, manifest, 30000, 0)).toBeLessThan(0);
  });
  it("coarse interpolation remains exact at measured coarse vertices", () => {
    const grid = Float32Array.from({ length: 25 }, (_, i) => i * 10);
    expect(coarseTerrainElevation(grid, manifest, 0, 0, 0)).toBeCloseTo(
      terrainElevation(grid, manifest, 0, 0),
    );
  });
  it("sweeps the flight segment over a measured ridge and covers coarse fallback", () => {
    const ridge = new Float32Array(25);
    for (let y = 0; y < 5; y++) ridge[y * 5 + 2] = 1000;
    const small = {
      ...manifest,
      sizeMeters: 400,
      tileGridSize: 3,
      maxLevel: 1,
    };
    const from = { x: -190, z: 0 },
      to = { x: 190, z: 0 };
    expect(sweptGroundHeight(ridge, small, from, to)).toBeGreaterThan(900);
    expect(collisionElevation(ridge, small, 0, 0)).toBeGreaterThanOrEqual(1000);
  });
  it("approaching demands more measured samples while keeping the far side coarse", () => {
    const far = desiredTerrainTiles(
      manifest,
      { x: 0, y: 60000, z: 0 },
      915,
      55,
      false,
    );
    const close = desiredTerrainTiles(
      manifest,
      { x: 0, y: 150, z: 0 },
      915,
      55,
      false,
    );
    expect(close.length).toBeGreaterThan(far.length);
    expect(Math.max(...close.map((t) => t.level))).toBe(4);
    expect(close.some((t) => t.level < 4)).toBe(true);
  });
});
