"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import type { CameraCommand, CameraStatus } from "@/components/scene/CameraRig";
import type { FlightInput, SurfaceStatus } from "@/lib/lunar/types";
import { lunarAsset } from "@/lib/lunar/data";
import MoonOrbitScene from "./MoonOrbitScene";
import LunarSurfaceScene from "./LunarSurfaceScene";

/** One globe texture per selected Moon session, shared across navigation modes.
 * Retention avoids re-decoding/re-uploading the 8K map during a surface return.
 * Leaving this destination releases it, including its loader cache entry.
 */
export default function MoonDestination({
  mode = "orbit",
  onSurfaceStatus,
  ...props
}: {
  mode?: "orbit" | "surface";
  command: CameraCommand | null;
  reducedMotion?: boolean;
  inputEnabled?: boolean;
  flightInput?: FlightInput;
  onSurfaceStatus?: (status: SurfaceStatus) => void;
  onCameraStatus?: (status: CameraStatus) => void;
}) {
  const width = useThree((state) =>
    Math.min(state.size.width, state.size.height),
  );
  const url = lunarAsset(width < 700 ? "moon-4k.jpg" : "moon.jpg");
  const texture = useTexture(url, (t) => {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
  });
  useEffect(
    () => () => {
      texture.dispose();
      useTexture.clear(url);
    },
    [texture, url],
  );
  return mode === "surface" ? (
    <LunarSurfaceScene {...props} onStatus={onSurfaceStatus} />
  ) : (
    <MoonOrbitScene {...props} texture={texture} />
  );
}
