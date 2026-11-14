import { describe, expect, it } from "vitest";
import {
  DEFAULT_CAMERA,
  fitRadiusDistance,
  RING_OUTER_RADIUS,
  saturnOverviewDistance,
} from "./scene-config";

describe("camera framing", () => {
  it("fits the complete Saturn ring system with margin in desktop and mobile views", () => {
    for (const aspect of [1065 / 650, 494 / 430]) {
      const distance = fitRadiusDistance(RING_OUTER_RADIUS, 40, aspect);
      const visibleHalfHeight = distance * Math.tan((20 * Math.PI) / 180);
      expect(visibleHalfHeight).toBeGreaterThan(RING_OUTER_RADIUS * 1.12);
      expect(distance).toBeGreaterThan(15);
    }
  });

  it("accounts for the narrower horizontal field in portrait canvases", () => {
    const distance = fitRadiusDistance(2, 40, 0.6);
    const visibleHalfWidth = distance * Math.tan((20 * Math.PI) / 180) * 0.6;
    expect(visibleHalfWidth).toBeGreaterThan(2 * 1.12);
    expect(distance).toBeGreaterThan(fitRadiusDistance(2, 40, 1.5));
  });

  it("preserves desktop composition and gives narrow overviews enough horizontal room", () => {
    expect(saturnOverviewDistance(40, 1065 / 650)).toBeCloseTo(
      Math.hypot(...DEFAULT_CAMERA),
    );
    const mobileDistance = saturnOverviewDistance(40, 412 / 430);
    const mobileHalfWidth =
      (mobileDistance * Math.tan((20 * Math.PI) / 180) * 412) / 430;
    expect(mobileDistance).toBeGreaterThan(15);
    expect(mobileHalfWidth).toBeGreaterThan(RING_OUTER_RADIUS * 1.12);
  });

  it("requires sensible perspective parameters", () => {
    expect(() => fitRadiusDistance(2, 0, 1)).toThrow(RangeError);
    expect(() => fitRadiusDistance(2, 40, 0)).toThrow(RangeError);
  });
});
