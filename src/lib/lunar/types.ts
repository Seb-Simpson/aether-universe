export interface LunarManifest {
  name?: string;
  centerLat: number;
  centerLon: number;
  sizeMeters: number;
  radiusMeters: number;
  gridSize: number;
  minElevation: number;
  maxElevation: number;
  referenceElevation: number;
  sourceResolutionMeters: number;
  imageryResolutionMeters?: number;
  maxLevel: number;
  tileGridSize: number;
  heightUrl: string;
  tileTemplate: string;
  textureTemplate: string;
  regionTextureUrl: string;
}
export interface FlightInput {
  forward: number;
  right: number;
  up: number;
}
export interface SurfaceStatus {
  ready: boolean;
  loading: boolean;
  error: string | null;
  altitude: number;
  clearance: number;
  level: number;
  tiles: number;
  bytes: number;
  position: { x: number; y: number; z: number };
  sourceResolution: number;
}
export interface TileAddress {
  level: number;
  x: number;
  y: number;
}
export const tileKey = ({ level, x, y }: TileAddress) => `${level}/${x}/${y}`;
export function tileAddress(key: string): TileAddress {
  const [level, x, y] = key.split("/").map(Number);
  return { level, x, y };
}
