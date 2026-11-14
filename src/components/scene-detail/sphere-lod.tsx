"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Mesh, PerspectiveCamera, SphereGeometry, Vector3 } from "three";
import type { BodyId } from "@/data/bodies";
import {
  projectedSphereDiameter,
  sphereDetailForDiameter,
  sphereSegments,
  type SphereDetail,
} from "@/lib/detail-policy";

type SpherePool = Record<SphereDetail, SphereGeometry>;
const GeometryContext = createContext<SpherePool | null>(null);

/** Exactly three shared CPU geometries per scene. GPU buffers upload lazily,
 * remain bounded after first use, and are released with the scene provider.
 */
export function SphereDetailProvider({ children }: { children: ReactNode }) {
  const pool = useMemo(
    (): SpherePool => ({
      low: new SphereGeometry(1, ...sphereSegments.low),
      medium: new SphereGeometry(1, ...sphereSegments.medium),
      high: new SphereGeometry(1, ...sphereSegments.high),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const geometry of Object.values(pool)) geometry.dispose();
    },
    [pool],
  );
  return (
    <GeometryContext.Provider value={pool}>{children}</GeometryContext.Provider>
  );
}

/** Attach ref/geometry to a mesh scaled to its scene radius. No React state or
 * geometry/material creation occurs during a zoom, focus transition or frame.
 */
export function useSphereLod(id: BodyId, radius: number) {
  const pool = useContext(GeometryContext);
  if (!pool) throw new Error("Sphere LOD requires a SphereDetailProvider");
  const meshRef = useRef<Mesh>(null);
  const tier = useRef<SphereDetail>("high");
  const position = useMemo(() => new Vector3(), []);
  const { camera, size, gl } = useThree();
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || !(camera instanceof PerspectiveCamera)) return;
    mesh.getWorldPosition(position);
    const diameter = projectedSphereDiameter(
      radius,
      camera.position.distanceTo(position),
      camera.fov,
      size.height,
    );
    const next = sphereDetailForDiameter(diameter, tier.current);
    if (next !== tier.current || mesh.geometry !== pool[next]) {
      mesh.geometry = pool[next];
      tier.current = next;
    }
    gl.domElement.setAttribute(`data-lod-${id}`, next);
  });
  return { meshRef, geometry: pool.high };
}
