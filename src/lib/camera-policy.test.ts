import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { sceneBodies, DEFAULT_CAMERA } from "./scene-config";
import { bodyOrder } from "@/data/bodies";
import {
  cameraBounds,
  cameraClearance,
  cameraSegmentIsClear,
  RING_NORMAL,
  transferWaypoints,
} from "./camera-policy";

describe("orbital navigation constraints", () => {
  it("rejects a swept path through a body despite clear endpoints", () => {
    const start = new Vector3(0, 0, 10),
      end = new Vector3(0, 0, -10);
    expect(cameraClearance(start)).toBeGreaterThan(0);
    expect(cameraClearance(end)).toBeGreaterThan(0);
    expect(cameraSegmentIsClear(start, end)).toBe(false);
    expect(cameraClearance(new Vector3())).toBeLessThan(0);
  });
  it("protects the tilted ring volume, including paths crossing between frames", () => {
    const normal = new Vector3(RING_NORMAL.x, RING_NORMAL.y, RING_NORMAL.z);
    const inPlane = new Vector3(normal.y, -normal.x, 0)
      .normalize()
      .multiplyScalar(3);
    const above = inPlane.clone().add(normal),
      below = inPlane.clone().sub(normal);
    expect(cameraClearance(inPlane)).toBeLessThan(0);
    expect(cameraClearance(above)).toBeGreaterThan(0);
    expect(cameraClearance(below)).toBeGreaterThan(0);
    expect(cameraSegmentIsClear(above, below)).toBe(false);
  });
  it("routes a blocked transfer around obstacles without losing the destination", () => {
    const start = new Vector3(0, 0, 10),
      end = new Vector3(0, 0, -10);
    const waypoints = transferWaypoints(start, end);
    expect(waypoints.length).toBeGreaterThan(1);
    expect(waypoints.at(-1)?.distanceTo(end)).toBeLessThan(1e-8);
    let previous = start;
    for (const waypoint of waypoints) {
      expect(cameraClearance(waypoint)).toBeGreaterThan(0);
      expect(cameraSegmentIsClear(previous, waypoint)).toBe(true);
      previous = waypoint;
    }
  });
  it("keeps resets inside detail bounds on desktop, portrait and tall displays", () => {
    for (const id of bodyOrder)
      for (const [w, h] of [
        [1440, 1000],
        [412, 915],
        [360, 800],
        [2048, 3000],
      ]) {
        const bounds = cameraBounds(id, 40, w / h, h, 1.75);
        expect(bounds.overview).toBeGreaterThanOrEqual(bounds.min);
        expect(bounds.max).toBeGreaterThan(bounds.overview);
      }
    expect(cameraBounds("saturn", 40, 360 / 800, 800, 1).max).toBeGreaterThan(
      23,
    );
  });
  it("connects every default subject pose through safe space on desktop and phone", () => {
    for (const [w, h] of [
      [1440, 1000],
      [412, 915],
    ]) {
      const poses = bodyOrder.map((id) => {
        const bounds = cameraBounds(id, 40, w / h, h, 1.75);
        const direction =
          id === "saturn"
            ? new Vector3(...DEFAULT_CAMERA).normalize()
            : new Vector3(0, 0.22, 1).normalize();
        return new Vector3(...sceneBodies[id].position).addScaledVector(
          direction,
          bounds.overview,
        );
      });
      for (const start of poses)
        for (const end of poses) {
          expect(cameraClearance(end)).toBeGreaterThan(0);
          const route = transferWaypoints(start, end);
          expect(route.length).toBeGreaterThan(0);
          let previous = start;
          for (const waypoint of route) {
            expect(cameraSegmentIsClear(previous, waypoint)).toBe(true);
            previous = waypoint;
          }
          expect(previous.distanceTo(end)).toBeLessThan(1e-8);
        }
    }
  });
});
