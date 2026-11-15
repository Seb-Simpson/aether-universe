"use client";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import {
  BufferGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
  Spherical,
  type Texture,
} from "three";
import type { CameraCommand, CameraStatus } from "@/components/scene/CameraRig";
import { lunarAsset } from "@/lib/lunar/data";
import type { LunarManifest } from "@/lib/lunar/types";
const R = 1737400;
const normal = new Vector3(
  Math.sin((312.5 * Math.PI) / 180) * Math.cos((23.7 * Math.PI) / 180),
  Math.sin((23.7 * Math.PI) / 180),
  Math.cos((312.5 * Math.PI) / 180) * Math.cos((23.7 * Math.PI) / 180),
);
const south = new Vector3(
  Math.sin((312.5 * Math.PI) / 180) * Math.sin((23.7 * Math.PI) / 180),
  -Math.cos((23.7 * Math.PI) / 180),
  Math.cos((312.5 * Math.PI) / 180) * Math.sin((23.7 * Math.PI) / 180),
);
export default function MoonOrbitScene({
  command,
  texture,
  reducedMotion = false,
  inputEnabled = true,
  onCameraStatus,
}: {
  command: CameraCommand | null;
  texture: Texture;
  reducedMotion?: boolean;
  inputEnabled?: boolean;
  onCameraStatus?: (status: CameraStatus) => void;
}) {
  const { camera, gl, invalidate, size } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null),
    targetEye = useRef(new Vector3()),
    targetLook = useRef(new Vector3()),
    moving = useRef(false),
    initialized = useRef(false),
    last = useRef(-1),
    frames = useRef(0);
  const patchVisibility = useRef({ value: 0 });
  const [data, setData] = useState<{
    manifest: LunarManifest;
    grid: Float32Array;
  } | null>(null);
  useEffect(() => {
    const c = new AbortController();
    (async () => {
      const response = await fetch(lunarAsset("manifest.json"), {
        signal: c.signal,
      });
      if (!response.ok) throw new Error("Region metadata unavailable");
      const manifest = (await response.json()) as LunarManifest;
      const root = await fetch(
        lunarAsset(
          manifest.tileTemplate
            .replace("{level}", "0")
            .replace("{x}", "0")
            .replace("{y}", "0"),
        ),
        { signal: c.signal },
      );
      if (!root.ok) throw new Error("Parent terrain unavailable");
      return { manifest, grid: new Float32Array(await root.arrayBuffer()) };
    })()
      .then(setData)
      .catch(() => {});
    return () => c.abort();
  }, []);
  const globeDistance = Math.max(
    8,
    2.6 /
      (Math.tan((20 * Math.PI) / 180) * Math.min(1, size.width / size.height)),
  );
  const pose = (eye: Vector3, look: Vector3) => {
    targetEye.current.copy(eye);
    targetLook.current.copy(look);
    moving.current = true;
    onCameraStatus?.({ limit: null });
    invalidate();
  };
  useEffect(() => {
    Object.assign(camera, { fov: 40, near: 0.00005, far: 200 });
    camera.updateProjectionMatrix();
    const start = normal.clone().multiplyScalar(globeDistance);
    if (!initialized.current) {
      camera.position.copy(start);
      controls.current?.target.set(0, 0, 0);
      camera.lookAt(0, 0, 0);
      initialized.current = true;
      moving.current = false;
      invalidate();
    } else pose(start, new Vector3());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, globeDistance]);
  useEffect(() => {
    if (!command || command.nonce === last.current) return;
    last.current = command.nonce;
    const c = controls.current;
    if (!c) return;
    if (command.type === "reset") {
      patchVisibility.current.value = 0;
      pose(normal.clone().multiplyScalar(globeDistance), new Vector3());
      return;
    }
    if (command.type === "approach-region") {
      patchVisibility.current.value = 1;
      const center = normal.clone().multiplyScalar(2 * (1 - 3003 / R));
      pose(
        center
          .clone()
          .addScaledVector(normal, (26000 / R) * 2)
          .addScaledVector(south, (27000 / R) * 2),
        center,
      );
      return;
    }
    const target = moving.current
      ? targetLook.current.clone()
      : c.target.clone();
    const offset = (
      moving.current ? targetEye.current.clone() : camera.position.clone()
    ).sub(target);
    if (command.type === "zoom-in" || command.type === "zoom-out")
      offset.multiplyScalar(command.type === "zoom-in" ? 0.72 : 1.4);
    else if (command.type === "top")
      offset.set(0, Math.max(6, offset.length()), 0.1);
    else if (command.type === "angle")
      offset.copy(normal).multiplyScalar(Math.max(6, offset.length()));
    else {
      const s = new Spherical().setFromVector3(offset);
      if (command.type === "orbit-left") s.theta -= 0.15;
      if (command.type === "orbit-right") s.theta += 0.15;
      if (command.type === "orbit-up") s.phi = Math.max(0.05, s.phi - 0.15);
      if (command.type === "orbit-down")
        s.phi = Math.min(Math.PI - 0.05, s.phi + 0.15);
      offset.setFromSpherical(s);
    }
    const eye = target.clone().add(offset);
    if (eye.length() < 2.01) eye.setLength(2.01);
    if (eye.length() > 50) eye.setLength(50);
    pose(eye, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command]);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (moving.current && inputEnabled) {
      const f = reducedMotion ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 6);
      camera.position.lerp(targetEye.current, f);
      c.target.lerp(targetLook.current, f);
      if (camera.position.length() < 2.009) camera.position.setLength(2.009);
      c.update();
      if (
        camera.position.distanceTo(targetEye.current) < 0.00001 &&
        c.target.distanceTo(targetLook.current) < 0.00001
      )
        moving.current = false;
      invalidate();
    }
    if (camera.position.length() < 2.009) {
      camera.position.setLength(2.009);
      c.update();
    }
    frames.current++;
    if (frames.current < 5) invalidate();
    const values = {
      "data-selected": "moon",
      "data-navigation-mode": "orbit",
      "data-camera-mode": "orbit",
      "data-camera-settled": String(
        initialized.current && !moving.current && frames.current >= 4,
      ),
      "data-camera-distance": camera.position.distanceTo(c.target).toFixed(5),
      "data-camera-polar": c.getPolarAngle().toFixed(5),
      "data-camera-clearance": (camera.position.length() - 2).toFixed(6),
      "data-geometries": String(gl.info.memory.geometries),
      "data-textures": String(gl.info.memory.textures),
      "data-triangles": String(gl.info.render.triangles),
    };
    for (const [k, v] of Object.entries(values))
      gl.domElement.setAttribute(k, v);
  });
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({ map: texture, roughness: 1 });
    if (data) {
      const b = (
        data.manifest as LunarManifest & {
          bounds: { west: number; east: number; north: number; south: number };
        }
      ).bounds;
      const u0 = ((b.west + 180) % 360) / 360,
        u1 = ((b.east + 180) % 360) / 360,
        v0 = (b.south + 90) / 180,
        v1 = (b.north + 90) / 180;
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uPatchVisibility = patchVisibility.current;
        shader.fragmentShader =
          "uniform float uPatchVisibility;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          `#include <map_fragment>\nif(uPatchVisibility>.5 && vMapUv.x>${u0}&&vMapUv.x<${u1}&&vMapUv.y>${v0}&&vMapUv.y<${v1}) discard;`,
        );
      };
      mat.customProgramCacheKey = () => "moon-dem-window";
    }
    return mat;
  }, [texture, data]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <>
      <ambientLight intensity={0.18} />
      <directionalLight
        position={normal
          .clone()
          .multiplyScalar(30)
          .addScaledVector(
            new Vector3(
              Math.cos((312.5 * Math.PI) / 180),
              0,
              -Math.sin((312.5 * Math.PI) / 180),
            ),
            -40,
          )
          .addScaledVector(south, -18)
          .toArray()}
        intensity={3.0}
      />
      <mesh rotation={[0, -Math.PI / 2, 0]} material={material}>
        <sphereGeometry args={[2, 192, 128]} />
      </mesh>
      {data && <RegionPatch {...data} visibility={patchVisibility} />}
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={inputEnabled}
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.12}
        minDistance={0.0005}
        maxDistance={50}
        onStart={() => {
          moving.current = false;
        }}
        onChange={() => invalidate()}
      />
    </>
  );
}
function RegionPatch({
  manifest: m,
  grid,
  visibility,
}: {
  visibility: import("react").RefObject<{ value: number }>;
  manifest: LunarManifest;
  grid: Float32Array;
}) {
  const mesh = useRef<import("three").Mesh>(null);
  useFrame(() => {
    if (mesh.current) mesh.current.visible = visibility.current.value > 0.5;
  });
  const texture = useTexture(lunarAsset("tiles/0/0/0.jpg"), (t) => {
    t.colorSpace = SRGBColorSpace;
  });
  useEffect(
    () => () => {
      texture.dispose();
      useTexture.clear(lunarAsset("tiles/0/0/0.jpg"));
    },
    [texture],
  );
  const geometry = useMemo(() => {
    const b = (
        m as LunarManifest & {
          bounds: { west: number; east: number; north: number; south: number };
        }
      ).bounds,
      n = 65,
      p: number[] = [],
      uv: number[] = [],
      index: number[] = [];
    for (let z = 0; z < n; z++)
      for (let x = 0; x < n; x++) {
        const lat =
            ((b.north - ((b.north - b.south) * z) / (n - 1)) * Math.PI) / 180,
          lon = ((b.west + ((b.east - b.west) * x) / (n - 1)) * Math.PI) / 180,
          h = grid[z * n + x],
          r = 2 * (1 + h / R);
        p.push(
          Math.sin(lon) * Math.cos(lat) * r,
          Math.sin(lat) * r,
          Math.cos(lon) * Math.cos(lat) * r,
        );
        uv.push(x / (n - 1), 1 - z / (n - 1));
        if (x < n - 1 && z < n - 1) {
          const a = z * n + x;
          index.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
        }
      }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(p, 3));
    g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  }, [grid, m]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh ref={mesh} visible={false} geometry={geometry}>
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  );
}
