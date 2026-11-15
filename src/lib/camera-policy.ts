import { Vector3, type PerspectiveCamera } from "three";
import type { SaturnBodyId } from "./scene-config";
import {
  sceneBodies,
  RING_OUTER_RADIUS,
  fitRadiusDistance,
  saturnOverviewDistance,
} from "./scene-config";
import { textureLimitedDistance } from "./detail-policy";

/** Navigation units are illustrative scene units; no real altitude is inferred. */
export const CAMERA_MODE = "orbit" as const;
export const CAMERA_RADIUS = 0.045;
export const RING_MARGIN = 0.16;
// Transform of Saturn's local +Y by its art-directed XYZ rotation [0.08,0,-0.31].
export const RING_NORMAL = {
  x: -Math.sin(-0.31),
  y: Math.cos(0.08) * Math.cos(-0.31),
  z: Math.sin(0.08) * Math.cos(-0.31),
};
interface Point {
  x: number;
  y: number;
  z: number;
}
const obstacles = Object.values(sceneBodies).map((body) => ({
  center: { x: body.position[0], y: body.position[1], z: body.position[2] },
  radius: body.radius + CAMERA_RADIUS,
}));
const ringRadius = RING_OUTER_RADIUS + CAMERA_RADIUS;

export function cameraClearance(point: Point): number {
  let clearance = Infinity;
  for (const obstacle of obstacles) {
    clearance = Math.min(
      clearance,
      Math.hypot(
        point.x - obstacle.center.x,
        point.y - obstacle.center.y,
        point.z - obstacle.center.z,
      ) - obstacle.radius,
    );
  }
  const height =
    point.x * RING_NORMAL.x + point.y * RING_NORMAL.y + point.z * RING_NORMAL.z;
  const radial = Math.sqrt(
    Math.max(
      0,
      point.x * point.x +
        point.y * point.y +
        point.z * point.z -
        height * height,
    ),
  );
  const radialGap = radial - ringRadius;
  const planeGap = Math.abs(height) - RING_MARGIN;
  const ringGap =
    Math.hypot(Math.max(radialGap, 0), Math.max(planeGap, 0)) +
    Math.min(Math.max(radialGap, planeGap), 0);
  return Math.min(clearance, ringGap);
}

/** Analytic swept tests prevent tunneling even during low-frame-rate transfers. */
export function cameraSegmentIsClear(start: Point, end: Point): boolean {
  const dx = end.x - start.x,
    dy = end.y - start.y,
    dz = end.z - start.z;
  const lengthSquared = dx * dx + dy * dy + dz * dz;
  for (const obstacle of obstacles) {
    const ox = start.x - obstacle.center.x,
      oy = start.y - obstacle.center.y,
      oz = start.z - obstacle.center.z;
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, -(ox * dx + oy * dy + oz * dz) / lengthSquared),
          );
    if (
      Math.hypot(ox + dx * t, oy + dy * t, oz + dz * t) <
      obstacle.radius - 1e-6
    )
      return false;
  }
  const startHeight =
    start.x * RING_NORMAL.x + start.y * RING_NORMAL.y + start.z * RING_NORMAL.z;
  const deltaHeight =
    dx * RING_NORMAL.x + dy * RING_NORMAL.y + dz * RING_NORMAL.z;
  let low = 0,
    high = 1;
  if (Math.abs(deltaHeight) < 1e-10) {
    if (Math.abs(startHeight) > RING_MARGIN) return true;
  } else {
    const a = (-RING_MARGIN - startHeight) / deltaHeight,
      b = (RING_MARGIN - startHeight) / deltaHeight;
    low = Math.max(0, Math.min(a, b));
    high = Math.min(1, Math.max(a, b));
    if (low > high) return true;
  }
  const radialDx = dx - RING_NORMAL.x * deltaHeight,
    radialDy = dy - RING_NORMAL.y * deltaHeight,
    radialDz = dz - RING_NORMAL.z * deltaHeight;
  const rx = start.x - RING_NORMAL.x * startHeight,
    ry = start.y - RING_NORMAL.y * startHeight,
    rz = start.z - RING_NORMAL.z * startHeight;
  const divisor =
    radialDx * radialDx + radialDy * radialDy + radialDz * radialDz;
  const t =
    divisor < 1e-12
      ? low
      : Math.max(
          low,
          Math.min(
            high,
            -(rx * radialDx + ry * radialDy + rz * radialDz) / divisor,
          ),
        );
  return (
    Math.hypot(rx + radialDx * t, ry + radialDy * t, rz + radialDz * t) >
    ringRadius
  );
}

export function cameraBounds(
  id: SaturnBodyId,
  fov: number,
  aspect: number,
  height: number,
  dpr: number,
) {
  const radius = sceneBodies[id].radius;
  const min = Math.max(
    radius + CAMERA_RADIUS * 2,
    textureLimitedDistance(id, radius, fov, height, dpr),
  );
  const overview =
    id === "saturn"
      ? Math.max(min * 1.15, saturnOverviewDistance(fov, aspect))
      : Math.max(min * 1.18, fitRadiusDistance(radius, fov, aspect, 1.35));
  // The minimum can grow in very tall viewports; every pose remains reachable.
  return {
    min,
    max: Math.max(overview * 2.2, min * 3, id === "saturn" ? 40 : radius * 28),
    overview,
  };
}

/** Sparse free-space graph, built only on focus/preset commands, not per frame. */
export function transferWaypoints(start: Vector3, end: Vector3): Vector3[] {
  if (cameraSegmentIsClear(start, end)) return [end.clone()];
  const nodes = [start.clone(), end.clone()];
  for (const [x, y, z] of [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
    [1, 1, 1],
    [-1, 1, 1],
    [1, 1, -1],
    [-1, 1, -1],
    [1, -1, 1],
    [-1, -1, 1],
    [1, -1, -1],
    [-1, -1, -1],
  ])
    nodes.push(new Vector3(x, y, z).normalize().multiplyScalar(18));
  const distances = nodes.map(() => Infinity),
    previous = nodes.map(() => -1),
    visited = new Set<number>();
  distances[0] = 0;
  while (visited.size < nodes.length) {
    let nearest = -1;
    for (let i = 0; i < nodes.length; i++)
      if (!visited.has(i) && (nearest < 0 || distances[i] < distances[nearest]))
        nearest = i;
    if (nearest < 0 || distances[nearest] === Infinity) break;
    if (nearest === 1) {
      const path: Vector3[] = [];
      let cursor = 1;
      while (cursor !== 0) {
        path.unshift(nodes[cursor]);
        cursor = previous[cursor];
      }
      return path;
    }
    visited.add(nearest);
    for (let i = 1; i < nodes.length; i++)
      if (!visited.has(i) && cameraSegmentIsClear(nodes[nearest], nodes[i])) {
        const distance =
          distances[nearest] + nodes[nearest].distanceTo(nodes[i]);
        if (distance < distances[i]) {
          distances[i] = distance;
          previous[i] = nearest;
        }
      }
  }
  // Preserve a safe existing view rather than crossing an obstacle on failure.
  return [];
}

/** Imperative Three boundary; near/far scale with the selected render body. */
export function applyClippingRange(camera: PerspectiveCamera, radius: number) {
  camera.near = Math.max(0.002, radius * 0.015);
  camera.far = 200;
  camera.updateProjectionMatrix();
}
