"use client";
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  BufferGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  MeshDepthMaterial,
  RGBADepthPacking,
  SRGBColorSpace,
  Texture,
  Vector3,
} from "three";
import type { CameraCommand } from "@/components/scene/CameraRig";
import { loadLunarData, lunarAsset } from "@/lib/lunar/data";
import { TerrainTileCache } from "@/lib/lunar/tile-cache";
import {
  desiredTerrainTiles,
  parentKeys,
  terrainElevation,
  collisionElevation,
  sweptGroundHeight,
} from "@/lib/lunar/terrain-math";
import { makeTerrainGeometry } from "@/lib/lunar/geometry";
import {
  tileAddress,
  tileKey,
  type FlightInput,
  type LunarManifest,
  type SurfaceStatus,
  type TileAddress,
} from "@/lib/lunar/types";
export type { SurfaceStatus } from "@/lib/lunar/types";
interface Props {
  command: CameraCommand | null;
  reducedMotion?: boolean;
  inputEnabled?: boolean;
  flightInput?: FlightInput;
  onStatus?: (status: SurfaceStatus) => void;
}
interface Tile {
  mesh: Mesh;
  bytes: number;
  mix: { value: number };
  born: number;
}
export default function LunarSurfaceScene(props: Props) {
  const [data, setData] = useState<{
    manifest: LunarManifest;
    grid: Float32Array;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const callback = useRef(props.onStatus);
  useEffect(() => {
    callback.current = props.onStatus;
  }, [props.onStatus]);
  useEffect(() => {
    const controller = new AbortController();
    loadLunarData(controller.signal)
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("Elevation data could not load. Return to orbit and retry.");
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!data)
      callback.current?.({
        ready: false,
        loading: !error,
        error,
        altitude: 0,
        clearance: 0,
        level: 0,
        tiles: 0,
        bytes: 0,
        position: { x: 0, y: 0, z: 0 },
        sourceResolution: 60,
      });
  }, [data, error]);
  return data ? <SurfaceWorld {...props} {...data} /> : null;
}
function SurfaceWorld({
  manifest: m,
  grid,
  command,
  inputEnabled = true,
  flightInput,
  onStatus,
  reducedMotion = false,
}: Props & { manifest: LunarManifest; grid: Float32Array }) {
  const { camera, gl, invalidate, size } = useThree();
  const sunRef = useRef<DirectionalLight>(null);
  useEffect(() => {
    const light = sunRef.current;
    return () => light?.shadow.dispose();
  }, []);
  const group = useRef<Group>(null),
    cache = useRef<TerrainTileCache<Tile> | null>(null);
  const dirty = useRef(true),
    lastGeneration = useRef(""),
    failed = useRef(new Set<string>()),
    shown = useRef<Tile[]>([]);
  const direction = useRef({ yaw: 0, pitch: -0.7 }),
    keys = useRef(new Set<string>()),
    pointer = useRef<{ x: number; y: number } | null>(null),
    touchGap = useRef(0);
  const lastSignature = useRef("");
  const lastCommand = useRef(-1),
    lastStatus = useRef(0),
    targetAltitude = useRef<number | null>(null),
    didSet = useRef(false),
    frame = useRef(0),
    maxLevel = useRef(0);
  const input = useRef({ enabled: inputEnabled, flight: flightInput });
  input.current = { enabled: inputEnabled, flight: flightInput };
  const statusCallback = useRef(onStatus);
  useEffect(() => {
    statusCallback.current = onStatus;
  }, [onStatus]);
  const mobile = Math.min(size.width, size.height) < 700;
  const scratch = useRef({
    forward: new Vector3(),
    right: new Vector3(),
    look: new Vector3(),
    old: new Vector3(),
  });
  const reset = () => {
    camera.position.set(0, 26000 + terrainElevation(grid, m, 0, 0), 27000);
    direction.current = { yaw: 0, pitch: -Math.atan2(26000, 27000) };
    targetAltitude.current = null;
    didSet.current = true;
    dirty.current = true;
    invalidate();
  };
  useEffect(() => {
    Object.assign(camera, { near: 1, far: 2000000, fov: 40 });
    camera.updateProjectionMatrix();
    reset();
    const canvas = gl.domElement;
    canvas.setAttribute("data-navigation-mode", "surface");
    const down = (e: PointerEvent) => {
      if (!input.current.enabled) return;
      pointer.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!pointer.current || !input.current.enabled) return;
      direction.current.yaw -= (e.clientX - pointer.current.x) * 0.004;
      direction.current.pitch = Math.max(
        -1.5,
        Math.min(
          0.35,
          direction.current.pitch - (e.clientY - pointer.current.y) * 0.004,
        ),
      );
      pointer.current = { x: e.clientX, y: e.clientY };
      invalidate();
    };
    const up = () => {
      pointer.current = null;
    };
    const wheel = (e: WheelEvent) => {
      if (!input.current.enabled) return;
      e.preventDefault();
      const ground = collisionHeight(camera.position.x, camera.position.z);
      targetAltitude.current = Math.max(
        45,
        Math.min(
          70000,
          (targetAltitude.current ?? camera.position.y - ground) *
            Math.exp(e.deltaY * 0.001),
        ),
      );
      invalidate();
    };
    const keydown = (e: KeyboardEvent) => {
      if (
        !input.current.enabled ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        (e.target as HTMLElement)?.closest?.("aside,dialog")
      )
        return;
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "q",
          "e",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.key)
      ) {
        e.preventDefault();
        keys.current.add(e.key);
        invalidate();
      }
    };
    const keyup = (e: KeyboardEvent) => {
      keys.current.delete(e.key);
    };
    const blur = () => {
      keys.current.clear();
      pointer.current = null;
    };
    const touch = (e: TouchEvent) => {
      if (e.touches.length !== 2) {
        touchGap.current = 0;
        return;
      }
      e.preventDefault();
      pointer.current = null;
      const gap = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (touchGap.current) {
        const ground = collisionHeight(camera.position.x, camera.position.z);
        targetAltitude.current = Math.max(
          45,
          Math.min(
            70000,
            ((targetAltitude.current ?? camera.position.y - ground) *
              touchGap.current) /
              gap,
          ),
        );
        invalidate();
      }
      touchGap.current = gap;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("touchmove", touch, { passive: false });
    canvas.addEventListener("touchend", touch);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("touchmove", touch);
      canvas.removeEventListener("touchend", touch);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
    };
    // This controller is scoped to one immutable region and canvas lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, gl, m, grid]);
  function collisionHeight(x: number, z: number) {
    return collisionElevation(grid, m, x, z);
  }

  useEffect(() => {
    if (!command || command.nonce === lastCommand.current) return;
    lastCommand.current = command.nonce;
    if (command.type === "reset") {
      reset();
      return;
    }
    const ground = collisionHeight(camera.position.x, camera.position.z),
      alt = targetAltitude.current ?? camera.position.y - ground;
    if (command.type === "zoom-in" || command.type === "zoom-out") {
      targetAltitude.current = Math.max(
        45,
        Math.min(70000, alt * (command.type === "zoom-in" ? 0.62 : 1.6)),
      );
      invalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command]);
  useEffect(() => {
    if (!inputEnabled) {
      keys.current.clear();
      pointer.current = null;
    }
    invalidate();
  }, [inputEnabled, flightInput, invalidate]);
  useEffect(() => {
    const loader = async (key: string, signal: AbortSignal) => {
      const t = tileAddress(key),
        path = (template: string) =>
          lunarAsset(
            template
              .replace("{level}", String(t.level))
              .replace("{x}", String(t.x))
              .replace("{y}", String(t.y)),
          );
      const [heights, image] = await Promise.all([
        fetch(path(m.tileTemplate), { signal }),
        fetch(path(m.textureTemplate), { signal }),
      ]);
      if (!heights.ok || !image.ok) throw new Error("Terrain tile unavailable");
      const samples = new Float32Array(await heights.arrayBuffer());
      if (
        samples.length !== m.tileGridSize ** 2 ||
        !samples.every(Number.isFinite)
      )
        throw new Error("Invalid tile size");
      const bitmap = await createImageBitmap(await image.blob(), {
        imageOrientation: "flipY",
      });
      if (signal.aborted) {
        bitmap.close();
        throw new DOMException("Cancelled", "AbortError");
      }
      const texture = new Texture(bitmap);
      texture.flipY = false;
      texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true;
      texture.anisotropy = 4;
      const geometry = makeTerrainGeometry(m, grid, t, samples),
        mix = { value: t.level ? 0 : 1 };
      const material = new MeshStandardMaterial({
        map: texture,
        roughness: 1,
        metalness: 0,
      });
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uTerrainMorph = mix;
        shader.vertexShader =
          "attribute float parentY; attribute vec3 parentNormal; uniform float uTerrainMorph;\n" +
          shader.vertexShader;
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <beginnormal_vertex>",
            "#include <beginnormal_vertex>\nobjectNormal = normalize(mix(parentNormal, normal, uTerrainMorph));",
          )
          .replace(
            "#include <begin_vertex>",
            "vec3 transformed=vec3(position.x,mix(parentY,position.y,uTerrainMorph),position.z);",
          );
      };
      material.customProgramCacheKey = () => "lunar-parent-morph-v1";
      const mesh = new Mesh(geometry, material);
      const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
      depth.onBeforeCompile = (shader) => {
        shader.uniforms.uTerrainMorph = mix;
        shader.vertexShader =
          "attribute float parentY; attribute float isSkirt; varying float vSkirt; uniform float uTerrainMorph;\n" +
          shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "vec3 transformed=vec3(position.x,mix(parentY,position.y,uTerrainMorph),position.z); vSkirt=isSkirt;",
        );
        shader.fragmentShader =
          "varying float vSkirt;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "void main() {",
          "void main() { if(vSkirt>0.0001) discard;",
        );
      };
      mesh.customDepthMaterial = depth;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const bytes =
        Object.values(geometry.attributes).reduce(
          (sum, a) => sum + a.array.byteLength,
          geometry.index!.array.byteLength,
        ) +
        bitmap.width * bitmap.height * 4;
      return { value: { mesh, bytes, mix, born: performance.now() }, bytes };
    };
    const c = new TerrainTileCache<Tile>({
      load: loader,
      dispose: (tile) => {
        tile.mesh.removeFromParent();
        tile.mesh.geometry.dispose();
        tile.mesh.customDepthMaterial?.dispose();
        const mat = tile.mesh.material as MeshStandardMaterial;
        const map = mat.map;
        if (map) {
          (map.image as ImageBitmap).close?.();
          map.dispose();
        }
        mat.dispose();
      },
      maxBytes: (mobile ? 32 : 64) * 1024 ** 2,
      maxEntries: mobile ? 100 : 180,
      maxConcurrent: 3,
      pinned: ["0/0/0"],
      onChange: () => {
        dirty.current = true;
        invalidate();
      },
    });
    cache.current = c;
    dirty.current = true;
    lastGeneration.current = "";
    return () => {
      c.dispose();
      cache.current = null;
      shown.current = [];
    };
  }, [m, grid, mobile, invalidate]);
  useFrame((_, delta) => {
    if (!didSet.current || !cache.current || !group.current) return;
    scratch.current.old.copy(camera.position);
    const dt = Math.min(0.08, delta),
      ground = collisionHeight(camera.position.x, camera.position.z),
      alt = Math.max(45, camera.position.y - ground),
      active = input.current.enabled && !document.hidden;
    if (active) {
      const f =
        (input.current.flight?.forward ?? 0) +
        (keys.current.has("w") || keys.current.has("ArrowUp") ? 1 : 0) -
        (keys.current.has("s") || keys.current.has("ArrowDown") ? 1 : 0);
      const r =
        (input.current.flight?.right ?? 0) +
        (keys.current.has("d") || keys.current.has("ArrowRight") ? 1 : 0) -
        (keys.current.has("a") || keys.current.has("ArrowLeft") ? 1 : 0);
      const u =
        (input.current.flight?.up ?? 0) +
        (keys.current.has("e") ? 1 : 0) -
        (keys.current.has("q") ? 1 : 0);
      const speed = Math.max(160, Math.min(3500, alt * 0.65));
      if (f || r || u) {
        targetAltitude.current = null;
        camera.position.x +=
          (Math.sin(direction.current.yaw) * f +
            Math.cos(direction.current.yaw) * r) *
          speed *
          dt;
        camera.position.z +=
          (-Math.cos(direction.current.yaw) * f +
            Math.sin(direction.current.yaw) * r) *
          speed *
          dt;
        camera.position.y += u * speed * dt;
        invalidate();
      }
      if (targetAltitude.current !== null) {
        const goalZ = Math.min(
          28500,
          7000 + 20000 * Math.sqrt(targetAltitude.current / 28000),
        );
        camera.position.z = reducedMotion
          ? goalZ
          : camera.position.z +
            (goalZ - camera.position.z) * (1 - Math.exp(-dt * 6));
        direction.current.pitch =
          -0.1 - 0.65 * Math.min(1, targetAltitude.current / 26000);
        const wanted =
          collisionHeight(camera.position.x, camera.position.z) +
          targetAltitude.current;
        camera.position.y = reducedMotion
          ? wanted
          : camera.position.y +
            (wanted - camera.position.y) * (1 - Math.exp(-dt * 6));
        if (Math.abs(camera.position.y - wanted) < 0.5) {
          camera.position.y = wanted;
          targetAltitude.current = null;
        } else invalidate();
      }
    }
    const edge = m.sizeMeters / 2 - 800;
    camera.position.x = Math.max(-edge, Math.min(edge, camera.position.x));
    camera.position.z = Math.max(-edge, Math.min(edge, camera.position.z));
    camera.position.y = Math.max(
      sweptGroundHeight(grid, m, scratch.current.old, camera.position) + 45,
      Math.min(75000, camera.position.y),
    );
    scratch.current.look.set(
      Math.sin(direction.current.yaw) * Math.cos(direction.current.pitch),
      Math.sin(direction.current.pitch),
      -Math.cos(direction.current.yaw) * Math.cos(direction.current.pitch),
    );
    camera.lookAt(scratch.current.look.add(camera.position));
    const desired = desiredTerrainTiles(
        m,
        camera.position,
        size.height,
        40,
        mobile,
      ),
      wanted = parentKeys(desired),
      generation = wanted.join(";");
    const c = cache.current;
    if (generation !== lastGeneration.current) {
      lastGeneration.current = generation;
      failed.current.clear();
      c.setWanted(wanted);
      dirty.current = true;
    }
    for (const key of wanted)
      if (!c.peek(key) && !failed.current.has(key))
        void c.request(key).catch((e) => {
          if (e.name !== "AbortError") failed.current.add(key);
        });
    if (dirty.current) {
      const split = new Set(wanted),
        visibleTiles: Tile[] = [];
      const visit = (t: TileAddress) => {
        const key = tileKey(t),
          tile = c.peek(key);
        if (!tile) return;
        const children = [0, 1, 2, 3].map((i) => ({
          level: t.level + 1,
          x: t.x * 2 + (i % 2),
          y: t.y * 2 + Math.floor(i / 2),
        }));
        if (
          t.level < m.maxLevel &&
          children.some((ch) => split.has(tileKey(ch))) &&
          children.every((ch) => c.peek(tileKey(ch)))
        ) {
          for (const child of children) visit(child);
        } else {
          visibleTiles.push(tile);
          maxLevel.current = Math.max(maxLevel.current, t.level);
        }
      };
      maxLevel.current = 0;
      visit({ level: 0, x: 0, y: 0 });
      for (const tile of shown.current)
        if (!visibleTiles.includes(tile)) tile.mesh.removeFromParent();
      for (const tile of visibleTiles)
        if (!tile.mesh.parent) {
          // Cached children also geomorph when they re-enter the visible frontier.
          if (tile.mesh.geometry.getAttribute("parentY")) tile.mix.value = 0;
          group.current.add(tile.mesh);
        }
      shown.current = visibleTiles;
      dirty.current = false;
    }
    let morphing = false;
    for (const tile of shown.current)
      if (tile.mix.value < 1) {
        tile.mix.value = Math.min(1, tile.mix.value + dt / 0.45);
        morphing = true;
      }
    if (morphing) invalidate();
    const stats = c.stats,
      clearance =
        camera.position.y -
        collisionHeight(camera.position.x, camera.position.z),
      loading = stats.pending + stats.queued > 0;
    const telemetry: Record<string, string> = {
      "data-navigation-mode": "surface",
      "data-selected": "moon",
      "data-camera-mode": "surface",
      "data-camera-settled": String(!targetAltitude.current),
      "data-terrain-level": String(maxLevel.current),
      "data-terrain-tiles": String(shown.current.length),
      "data-terrain-bytes": String(stats.bytes),
      "data-terrain-resident": String(stats.resident),
      "data-terrain-loading": String(loading),
      "data-terrain-morphing": String(morphing),
      "data-terrain-clearance": clearance.toFixed(2),
      "data-terrain-altitude": (
        camera.position.y -
        terrainElevation(grid, m, camera.position.x, camera.position.z)
      ).toFixed(2),
      "data-terrain-finest-spacing": String(
        m.sizeMeters / 64 / 2 ** maxLevel.current,
      ),
      "data-terrain-source-samples": String(
        shown.current.length * m.tileGridSize ** 2,
      ),
      "data-terrain-position-x": camera.position.x.toFixed(1),
      "data-terrain-position-z": camera.position.z.toFixed(1),
      "data-terrain-x": camera.position.x.toFixed(1),
      "data-terrain-z": camera.position.z.toFixed(1),
      "data-geometries": String(gl.info.memory.geometries),
      "data-textures": String(gl.info.memory.textures),
      "data-triangles": String(gl.info.render.triangles),
      "data-frame": String(++frame.current),
      "data-terrain-cancelled": String(stats.cancelled),
      "data-terrain-evictions": String(stats.evictions),
    };
    for (const [name, value] of Object.entries(telemetry))
      gl.domElement.setAttribute(name, value);
    const signature = `${shown.current.length > 0}/${loading}/${maxLevel.current}/${shown.current.length}/${failed.current.size}`;
    if (
      signature !== lastSignature.current ||
      performance.now() - lastStatus.current > 250 ||
      frame.current === 1
    ) {
      lastSignature.current = signature;
      lastStatus.current = performance.now();
      statusCallback.current?.({
        ready: shown.current.length > 0,
        loading,
        error: failed.current.size
          ? "Some tiles unavailable; parent detail retained"
          : null,
        altitude:
          camera.position.y -
          terrainElevation(grid, m, camera.position.x, camera.position.z),
        clearance,
        level: maxLevel.current,
        tiles: shown.current.length,
        bytes: stats.bytes + grid.byteLength,
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        sourceResolution: m.sourceResolutionMeters,
      });
    }
  });
  return (
    <>
      <ambientLight intensity={0.13} />
      <directionalLight
        ref={sunRef}
        position={[-40000, 30000, -18000]}
        intensity={3.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-33000}
        shadow-camera-right={33000}
        shadow-camera-top={33000}
        shadow-camera-bottom={-33000}
        shadow-camera-near={100}
        shadow-camera-far={150000}
        shadow-bias={-0.0001}
        shadow-normalBias={4}
      />
      <FarField manifest={m} />
      <group ref={group} />
    </>
  );
}
function FarField({ manifest: m }: { manifest: LunarManifest }) {
  const texture = useTexture(lunarAsset("moon-2k.jpg"), (texture) => {
    texture.colorSpace = SRGBColorSpace;
  });
  useEffect(
    () => () => {
      texture.dispose();
      useTexture.clear(lunarAsset("moon-2k.jpg"));
    },
    [texture],
  );
  const [geometry] = useState(() => {
    const g = new BufferGeometry(),
      p: number[] = [],
      uv: number[] = [],
      idx: number[] = [];
    const outer = [
      30000, 36000, 44000, 56000, 72000, 100000, 140000, 200000, 280000, 380000,
      500000, 650000, 800000,
    ];
    const coords = [
      ...outer
        .slice(1)
        .reverse()
        .map((v) => -v),
      ...Array.from({ length: 31 }, (_, i) => -30000 + i * 2000),
      ...outer.slice(1),
    ];
    const n = coords.length,
      lat0 = (m.centerLat * Math.PI) / 180;
    for (let z = 0; z < n; z++)
      for (let x = 0; x < n; x++) {
        const px = coords[x],
          pz = coords[z];
        p.push(
          px,
          -(
            m.radiusMeters - Math.sqrt(m.radiusMeters ** 2 - px ** 2 - pz ** 2)
          ),
          pz,
        );
        const lat = m.centerLat - ((pz / m.radiusMeters) * 180) / Math.PI,
          lon =
            m.centerLon +
            ((px / (m.radiusMeters * Math.cos(lat0))) * 180) / Math.PI;
        uv.push(((lon + 180) % 360) / 360, (lat + 90) / 180);
        if (x < n - 1 && z < n - 1) {
          const cx = (px + coords[x + 1]) / 2,
            cz = (pz + coords[z + 1]) / 2;
          if (
            Math.abs(cx) >= m.sizeMeters / 2 ||
            Math.abs(cz) >= m.sizeMeters / 2
          ) {
            const a = z * n + x;
            idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
          }
        }
      }
    g.setAttribute("position", new Float32BufferAttribute(p, 3));
    g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial map={texture} color="#969696" roughness={1} />
    </mesh>
  );
}
