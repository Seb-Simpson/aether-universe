import type { BodyId } from "@/data/bodies";

/** Actual bundled equirectangular maps; not terrain or elevation data. */
export const surfaceMapWidths: Record<BodyId, number> = {
  saturn: 2048,
  titan: 720,
  enceladus: 1440,
  rhea: 1440,
};

export type SphereDetail = "low" | "medium" | "high";
export const sphereSegments: Record<SphereDetail, readonly [number, number]> = {
  low: [24, 16],
  medium: [48, 32],
  high: [96, 64],
};
export const sphereTriangleCounts: Record<SphereDetail, number> = {
  low: 720,
  medium: 2976,
  high: 12096,
};

/** Projected diameter in CSS pixels for a sphere centered on the view axis.
 * Conservative for an off-axis body; selection/focus uses the on-axis case.
 */
export function projectedSphereDiameter(
  radius: number,
  distance: number,
  verticalFovDegrees: number,
  viewportHeight: number,
): number {
  if (distance <= radius) return Infinity;
  return (
    (viewportHeight * radius) /
    (Math.tan((verticalFovDegrees * Math.PI) / 360) *
      Math.sqrt(distance * distance - radius * radius))
  );
}

/** Bound central map magnification; DPR above 1.25 does not make the subject
 * progressively smaller on high-density phones. This is a perceptual budget,
 * not a guarantee of scientific detail or pixel-perfect map reconstruction.
 */
export function maximumSurfaceDiameter(id: BodyId, dpr = 1): number {
  return surfaceMapWidths[id] / (Math.PI * Math.min(1.25, Math.max(1, dpr)));
}

export function textureLimitedDistance(
  id: BodyId,
  radius: number,
  verticalFovDegrees: number,
  viewportHeight: number,
  dpr = 1,
): number {
  const diameter = maximumSurfaceDiameter(id, dpr);
  const ratio =
    viewportHeight /
    (diameter * Math.tan((verticalFovDegrees * Math.PI) / 360));
  return radius * Math.sqrt(1 + ratio * ratio);
}

/** CSS-size hysteresis keeps geometry stable during small orbit/zoom changes.
 * Low is for small distant bodies; high retains the old Saturn silhouette.
 */
export function sphereDetailForDiameter(
  diameter: number,
  previous: SphereDetail,
): SphereDetail {
  if (previous === "low")
    return diameter > 180 ? "high" : diameter > 60 ? "medium" : "low";
  if (previous === "medium")
    return diameter > 180 ? "high" : diameter < 44 ? "low" : "medium";
  return diameter < 44 ? "low" : diameter < 140 ? "medium" : "high";
}
