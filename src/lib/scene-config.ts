import type { BodyId } from "@/data/bodies";

export type SaturnBodyId = Exclude<BodyId, "moon">;

/** Art-directed view coordinates, deliberately not physical orbit distances. */
export const sceneBodies: Record<
  SaturnBodyId,
  { position: [number, number, number]; radius: number }
> = {
  saturn: { position: [0, 0, 0], radius: 2 },
  titan: { position: [5.4, 0.7, -2.8], radius: 0.35 },
  enceladus: { position: [-5.35, -0.8, 1.4], radius: 0.16 },
  rhea: { position: [4.6, -1.6, 3.6], radius: 0.23 },
};

export const DEFAULT_CAMERA: [number, number, number] = [0, 3.8, 11.8];
export const SATURN_TARGET: [number, number, number] = [0, 0, 0];
export const RING_INNER_RADIUS = 2.15;
export const RING_OUTER_RADIUS = 4.65;

/** Distance to frame a bounding sphere inside the narrower camera axis. */
export function fitRadiusDistance(
  radius: number,
  verticalFovDegrees: number,
  aspect: number,
  padding = 1.12,
): number {
  if (
    radius <= 0 ||
    verticalFovDegrees <= 0 ||
    verticalFovDegrees >= 180 ||
    aspect <= 0 ||
    padding < 1
  ) {
    throw new RangeError(
      "Camera fit requires positive dimensions, a FOV between 0 and 180, and padding at least 1.",
    );
  }
  const verticalHalfAngle = (verticalFovDegrees * Math.PI) / 360;
  const horizontalHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * aspect);
  return (
    (radius * padding) /
    Math.sin(Math.min(verticalHalfAngle, horizontalHalfAngle))
  );
}

/** Keep the composed desktop view; widen the overview on narrow canvases. */
export function saturnOverviewDistance(
  verticalFovDegrees: number,
  aspect: number,
): number {
  const horizontalFovDegrees =
    (2 *
      Math.atan(Math.tan((verticalFovDegrees * Math.PI) / 360) * aspect) *
      180) /
    Math.PI;
  const horizontalFit = fitRadiusDistance(
    RING_OUTER_RADIUS,
    horizontalFovDegrees,
    1,
  );
  return Math.max(Math.hypot(...DEFAULT_CAMERA), horizontalFit);
}
