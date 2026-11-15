import { BufferGeometry, Float32BufferAttribute } from "three";
import {
  coarseTerrainElevation,
  lunarSagitta,
  terrainElevation,
  tileBounds,
} from "./terrain-math";
import type { LunarManifest, TileAddress } from "./types";
/** Fixed grid with measured elevations, a parent morph channel and edge skirts. */
export function makeTerrainGeometry(
  m: LunarManifest,
  grid: Float32Array,
  tile: TileAddress,
  heights: Float32Array,
) {
  const n = m.tileGridSize,
    b = tileBounds(m, tile),
    positions: number[] = [],
    uv: number[] = [],
    parent: number[] = [],
    indices: number[] = [];
  const edges: number[] = [];
  for (let z = 0; z < n; z++)
    for (let x = 0; x < n; x++) {
      const px = b.x + (b.size * x) / (n - 1),
        pz = b.z + (b.size * z) / (n - 1);
      // Tile file samples are real datum elevations; curvature is analytic, not terrain.
      const h = heights[z * n + x];
      const fine =
        h - m.referenceElevation - lunarSagitta(px, pz, m.radiusMeters);
      if (!Number.isFinite(h))
        throw new Error("Terrain tile contains missing samples");
      positions.push(px, fine, pz);
      uv.push(x / (n - 1), 1 - z / (n - 1));
      parent.push(
        tile.level
          ? coarseTerrainElevation(grid, m, px, pz, tile.level - 1)
          : fine,
      );
      if (z < n - 1 && x < n - 1) {
        const a = z * n + x;
        indices.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
      }
    }
  for (let i = 0; i < n; i++) edges.push(i);
  for (let i = 1; i < n; i++) edges.push(i * n + n - 1);
  for (let i = n - 2; i >= 0; i--) edges.push((n - 1) * n + i);
  for (let i = n - 2; i > 0; i--) edges.push(i * n);
  const base = positions.length / 3;
  for (const index of edges) {
    positions.push(
      positions[index * 3],
      positions[index * 3 + 1] - 1800,
      positions[index * 3 + 2],
    );
    uv.push(uv[index * 2], uv[index * 2 + 1]);
    parent.push(parent[index] - 1800);
  }
  for (let i = 0; i < edges.length; i++) {
    const j = (i + 1) % edges.length;
    indices.push(edges[i], base + i, edges[j], edges[j], base + i, base + j);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  // Sample a shared DEM apron for normals. Skirt faces must never tilt the
  // surface edge normals, and adjacent tiles must agree at shared vertices.
  const normals: number[] = [],
    parentNormals: number[] = [];
  const step = m.sizeMeters / (m.gridSize - 1);
  const heightAt = (x: number, z: number, level: number | null) =>
    level === null
      ? terrainElevation(grid, m, x, z)
      : coarseTerrainElevation(grid, m, x, z, level);
  const normalAt = (x: number, z: number, level: number | null) => {
    const half = m.sizeMeters / 2;
    const west = Math.max(-half, x - step),
      east = Math.min(half, x + step);
    const north = Math.max(-half, z - step),
      south = Math.min(half, z + step);
    const nx =
      -(heightAt(east, z, level) - heightAt(west, z, level)) / (east - west);
    const nz =
      -(heightAt(x, south, level) - heightAt(x, north, level)) /
      (south - north);
    const length = Math.hypot(nx, 1, nz);
    return [nx / length, 1 / length, nz / length];
  };
  for (let i = 0; i < n * n; i++) {
    normals.push(...normalAt(positions[i * 3], positions[i * 3 + 2], null));
    parentNormals.push(
      ...normalAt(
        positions[i * 3],
        positions[i * 3 + 2],
        tile.level ? tile.level - 1 : null,
      ),
    );
  }
  for (const index of edges) {
    normals.push(...normals.slice(index * 3, index * 3 + 3));
    parentNormals.push(...parentNormals.slice(index * 3, index * 3 + 3));
  }
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute(
    "parentNormal",
    new Float32BufferAttribute(parentNormals, 3),
  );
  geometry.setAttribute(
    "isSkirt",
    new Float32BufferAttribute(
      Array.from({ length: positions.length / 3 }, (_, i) =>
        i >= n * n ? 1 : 0,
      ),
      1,
    ),
  );
  geometry.setAttribute("parentY", new Float32BufferAttribute(parent, 1));
  geometry.computeBoundingSphere();
  return geometry;
}
