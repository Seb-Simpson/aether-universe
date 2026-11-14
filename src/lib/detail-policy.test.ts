import { describe, expect, it } from "vitest";
import { SphereGeometry } from "three";
import {
  maximumSurfaceDiameter,
  projectedSphereDiameter,
  sphereDetailForDiameter,
  sphereSegments,
  sphereTriangleCounts,
  textureLimitedDistance,
} from "./detail-policy";

describe("bounded surface detail", () => {
  it("does not invent extra texture resolution when approaching a small map", () => {
    const limit = textureLimitedDistance("titan", 0.35, 40, 915, 1.75);
    expect(projectedSphereDiameter(0.35, limit, 40, 915)).toBeCloseTo(
      maximumSurfaceDiameter("titan", 1.75),
    );
    expect(maximumSurfaceDiameter("titan")).toBeLessThan(
      maximumSurfaceDiameter("enceladus"),
    );
    expect(maximumSurfaceDiameter("titan", 3)).toBe(
      maximumSurfaceDiameter("titan", 1.25),
    );
  });
  it("adapts the detail floor to viewport and keeps it outside the surface", () => {
    const short = textureLimitedDistance("rhea", 0.23, 40, 400);
    const tall = textureLimitedDistance("rhea", 0.23, 40, 1000);
    expect(short).toBeGreaterThan(0.23);
    expect(tall).toBeGreaterThan(short);
    expect(projectedSphereDiameter(2, 1, 40, 600)).toBe(Infinity);
  });
  it("uses hysteresis so small zoom changes do not churn geometry", () => {
    expect(sphereDetailForDiameter(55, "low")).toBe("low");
    expect(sphereDetailForDiameter(55, "medium")).toBe("medium");
    expect(sphereDetailForDiameter(160, "medium")).toBe("medium");
    expect(sphereDetailForDiameter(160, "high")).toBe("high");
    expect(sphereDetailForDiameter(181, "low")).toBe("high");
    expect(sphereDetailForDiameter(43, "high")).toBe("low");
  });
  it("keeps all shared pool tiers within the declared triangle budget", () => {
    for (const tier of ["low", "medium", "high"] as const) {
      const geometry = new SphereGeometry(1, ...sphereSegments[tier]);
      expect(geometry.index!.count / 3).toBe(sphereTriangleCounts[tier]);
      geometry.dispose();
    }
    expect(sphereTriangleCounts.low / sphereTriangleCounts.medium).toBeLessThan(
      0.25,
    );
  });
});
