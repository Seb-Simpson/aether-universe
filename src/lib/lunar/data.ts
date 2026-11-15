import { assetPath } from "@/lib/paths";
import type { LunarManifest } from "./types";
export const lunarAsset = (path: string) => assetPath(`/lunar/${path}`);
export async function loadLunarData(signal: AbortSignal) {
  const response = await fetch(lunarAsset("manifest.json"), { signal });
  if (!response.ok) throw new Error("Lunar manifest unavailable");
  const manifest = (await response.json()) as LunarManifest;
  const heights = await fetch(lunarAsset(manifest.heightUrl), { signal });
  if (!heights.ok) throw new Error("Lunar elevation unavailable");
  const grid = new Float32Array(await heights.arrayBuffer());
  if (grid.length !== manifest.gridSize ** 2 || !grid.every(Number.isFinite))
    throw new Error("Invalid or missing DEM samples");
  return { manifest, grid };
}
