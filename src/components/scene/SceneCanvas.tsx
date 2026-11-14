"use client";

import { assetPath } from "@/lib/paths";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentRef, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  MathUtils,
  PCFSoftShadowMap,
  PerspectiveCamera,
  RingGeometry,
  SRGBColorSpace,
  Vector3,
} from "three";
import type { BodyId } from "@/data/bodies";
import { bodies, bodyOrder } from "@/data/bodies";
import {
  DEFAULT_CAMERA,
  fitRadiusDistance,
  RING_INNER_RADIUS,
  RING_OUTER_RADIUS,
  sceneBodies,
  saturnOverviewDistance,
} from "@/lib/scene-config";

export type CameraCommand = {
  type: "zoom-in" | "zoom-out" | "reset" | "top" | "angle";
  nonce: number;
};

export interface SceneCanvasProps {
  selected: BodyId;
  onSelect: (id: BodyId) => void;
  motion: boolean;
  reducedMotion?: boolean;
  command: CameraCommand | null;
  onReady?: () => void;
  onError?: () => void;
}

function Fallback() {
  return (
    <div className="scene-fallback" role="status" data-testid="webgl-fallback">
      <div className="fallback-planet" aria-hidden="true" />
      <div className="fallback-message">
        <p>3D view unavailable</p>
        <span>You can still explore every object and its facts below.</span>
      </div>
    </div>
  );
}

class SceneBoundary extends Component<
  {
    children: ReactNode;
    onError?: () => void;
  },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}

function Stars() {
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    const positions = new Float32Array(1000 * 3);
    // Stable local seed avoids hydration differences and random scene changes.
    let seed = 1979;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 1000; i++) {
      const theta = random() * Math.PI * 2;
      const vertical = random() * 2 - 1;
      const radius = 40 + random() * 35;
      const horizontal = Math.sqrt(1 - vertical * vertical);
      positions.set(
        [
          horizontal * Math.cos(theta) * radius,
          vertical * radius,
          horizontal * Math.sin(theta) * radius,
        ],
        i * 3,
      );
    }
    result.setAttribute("position", new BufferAttribute(positions, 3));
    return result;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.045}
        color="#c2c8d3"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function Saturn({
  onSelect,
  motion,
}: Pick<SceneCanvasProps, "onSelect" | "motion">) {
  const [surface, rings] = useTexture(
    [assetPath("/textures/saturn.jpg"), assetPath("/textures/saturn-ring.png")],
    (textures) => {
      for (const texture of textures) {
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = 8;
      }
    },
  );
  const planet = useRef<Group>(null);
  const { invalidate } = useThree();
  const geometry = useMemo(() => {
    const result = new RingGeometry(
      RING_INNER_RADIUS,
      RING_OUTER_RADIUS,
      256,
      1,
    );
    const position = result.attributes.position;
    const uv = result.attributes.uv;
    for (let i = 0; i < position.count; i++) {
      const radius = Math.hypot(position.getX(i), position.getY(i));
      uv.setXY(
        i,
        (radius - RING_INNER_RADIUS) / (RING_OUTER_RADIUS - RING_INNER_RADIUS),
        0.5,
      );
    }
    return result;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => {
    if (motion && !document.hidden && planet.current) {
      planet.current.rotation.y += Math.min(delta, 0.05) * 0.025;
      invalidate();
    }
  });

  return (
    <group rotation={[0.08, 0, -0.31]}>
      <group ref={planet}>
        <mesh
          scale={[1, 0.902, 1]}
          castShadow
          receiveShadow
          onClick={(event) => {
            event.stopPropagation();
            if (event.delta > 3) return;
            onSelect("saturn");
          }}
        >
          <sphereGeometry args={[2, 96, 64]} />
          <meshStandardMaterial map={surface} roughness={0.95} metalness={0} />
        </mesh>
      </group>
      <mesh
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta > 3) return;
          onSelect("saturn");
        }}
      >
        <meshStandardMaterial
          map={rings}
          transparent
          opacity={0.95}
          side={DoubleSide}
          depthWrite={false}
          roughness={1}
          metalness={0}
          alphaTest={0.015}
        />
      </mesh>
    </group>
  );
}

function Moon({
  id,
  onSelect,
}: {
  id: Exclude<BodyId, "saturn">;
  onSelect: SceneCanvasProps["onSelect"];
}) {
  const texture = useTexture(bodies[id].texture, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
    loaded.anisotropy = 4;
  });
  const body = sceneBodies[id];
  return (
    <mesh
      position={body.position}
      castShadow
      receiveShadow
      onClick={(event) => {
        event.stopPropagation();
        if (event.delta > 3) return;
        onSelect(id);
      }}
    >
      <sphereGeometry args={[body.radius, 48, 32]} />
      <meshStandardMaterial map={texture} roughness={1} metalness={0} />
    </mesh>
  );
}

function CameraRig({
  selected,
  command,
  reducedMotion = false,
}: Pick<SceneCanvasProps, "selected" | "command" | "reducedMotion">) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, invalidate, gl, size } = useThree();
  const aspect = size.width / size.height;
  const verticalFov = camera instanceof PerspectiveCamera ? camera.fov : 40;
  const overviewDistance = saturnOverviewDistance(verticalFov, aspect);
  const destination = useRef(new Vector3(...DEFAULT_CAMERA));
  const targetDestination = useRef(new Vector3());
  const transitioning = useRef(false);
  const lastCommand = useRef<number | null>(null);
  const minDistance =
    selected === "saturn" ? 5.4 : sceneBodies[selected].radius * 2.8;
  const maxDistance = selected === "saturn" ? 23 : 8;

  useEffect(() => {
    const body = sceneBodies[selected];
    targetDestination.current.set(...body.position);
    if (selected === "saturn")
      destination.current
        .set(...DEFAULT_CAMERA)
        .normalize()
        .multiplyScalar(overviewDistance);
    else
      destination.current
        .set(...body.position)
        .add(new Vector3(0.3, body.radius * 1.2, body.radius * 6.5));
    transitioning.current = true;
    if (controls.current) {
      controls.current.minDistance = 0.05;
      controls.current.maxDistance = 30;
    }
    invalidate();
  }, [selected, overviewDistance, invalidate]);

  useEffect(() => {
    if (!command || command.nonce === lastCommand.current || !controls.current)
      return;
    lastCommand.current = command.nonce;
    const orbit = controls.current;
    if (command.type === "reset") {
      targetDestination.current.set(...sceneBodies[selected].position);
      if (selected === "saturn")
        destination.current
          .set(...DEFAULT_CAMERA)
          .normalize()
          .multiplyScalar(overviewDistance);
      else
        destination.current
          .set(...sceneBodies[selected].position)
          .add(
            new Vector3(
              0.3,
              sceneBodies[selected].radius * 1.2,
              sceneBodies[selected].radius * 6.5,
            ),
          );
    } else if (command.type === "top" || command.type === "angle") {
      targetDestination.current.set(...sceneBodies[selected].position);
      const viewRadius =
        selected === "saturn" && command.type === "top"
          ? RING_OUTER_RADIUS
          : sceneBodies[selected].radius;
      const fitDistance =
        camera instanceof PerspectiveCamera
          ? fitRadiusDistance(viewRadius, camera.fov, camera.aspect)
          : minDistance;
      // Presets always provide a complete subject view, even after a close zoom.
      const distance = MathUtils.clamp(
        Math.max(camera.position.distanceTo(orbit.target), fitDistance),
        minDistance,
        maxDistance,
      );
      const direction =
        command.type === "top"
          ? new Vector3(0, 1, 0.05)
          : new Vector3(0, 0.31, 1);
      destination.current
        .copy(targetDestination.current)
        .add(direction.normalize().multiplyScalar(distance));
    } else {
      targetDestination.current.copy(orbit.target);
      const offset = camera.position.clone().sub(orbit.target);
      const distance = MathUtils.clamp(
        offset.length() * (command.type === "zoom-in" ? 0.78 : 1.28),
        minDistance,
        maxDistance,
      );
      destination.current
        .copy(orbit.target)
        .add(offset.normalize().multiplyScalar(distance));
    }
    transitioning.current = true;
    orbit.minDistance = 0.05;
    orbit.maxDistance = 30;
    invalidate();
  }, [
    command,
    camera,
    selected,
    overviewDistance,
    minDistance,
    maxDistance,
    invalidate,
  ]);

  useEffect(() => {
    const resume = () => invalidate();
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, [invalidate]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    if (transitioning.current) {
      const amount = reducedMotion
        ? 1
        : 1 - Math.exp(-Math.min(delta, 0.1) * 6);
      camera.position.lerp(destination.current, amount);
      orbit.target.lerp(targetDestination.current, amount);
      orbit.update();
      const done =
        camera.position.distanceTo(destination.current) < 0.001 &&
        orbit.target.distanceTo(targetDestination.current) < 0.001;
      if (done) {
        transitioning.current = false;
        orbit.minDistance = minDistance;
        orbit.maxDistance = maxDistance;
      } else invalidate();
    }
    // Small read-only telemetry is useful to browser tests without exposing Three internals.
    gl.domElement.setAttribute(
      "data-camera-settled",
      String(!transitioning.current),
    );
    gl.domElement.setAttribute(
      "data-camera-distance",
      camera.position.distanceTo(orbit.target).toFixed(3),
    );
    gl.domElement.setAttribute(
      "data-camera-polar",
      orbit.getPolarAngle().toFixed(3),
    );
    gl.domElement.setAttribute("data-selected", selected);
    gl.domElement.setAttribute(
      "data-render-calls",
      String(gl.info.render.calls),
    );
    gl.domElement.setAttribute(
      "data-triangles",
      String(gl.info.render.triangles),
    );
    gl.domElement.setAttribute(
      "data-geometries",
      String(gl.info.memory.geometries),
    );
    gl.domElement.setAttribute(
      "data-textures",
      String(gl.info.memory.textures),
    );
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping={!reducedMotion}
      dampingFactor={0.09}
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={0.08}
      maxPolarAngle={Math.PI - 0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.65}
      onStart={() => {
        transitioning.current = false;
        if (controls.current) {
          controls.current.minDistance = minDistance;
          controls.current.maxDistance = maxDistance;
        }
      }}
      onChange={() => invalidate()}
    />
  );
}

function Scene({ onReady, onError, ...props }: SceneCanvasProps) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onError?.();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    onReady?.();
    invalidate();
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, invalidate, onReady, onError]);
  useEffect(() => {
    invalidate();
  }, [props.motion, invalidate]);

  return (
    <>
      <ambientLight intensity={0.16} color="#b4c4df" />
      <directionalLight
        position={[-7, 8, 6]}
        intensity={3.5}
        color="#fff3df"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-bias={-0.0005}
        shadow-normalBias={0.015}
      />
      <Stars />
      <Saturn onSelect={props.onSelect} motion={props.motion} />
      {bodyOrder
        .filter((id): id is Exclude<BodyId, "saturn"> => id !== "saturn")
        .map((id) => (
          <Moon key={id} id={id} onSelect={props.onSelect} />
        ))}
      <CameraRig
        selected={props.selected}
        command={props.command}
        reducedMotion={props.reducedMotion}
      />
    </>
  );
}

export default function SceneCanvas(props: SceneCanvasProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const externalReady = props.onReady;
  const externalError = props.onError;
  const errorCallback = useRef(externalError);
  useEffect(() => {
    errorCallback.current = externalError;
  }, [externalError]);

  useEffect(() => {
    // Defer browser capability detection until the mounted client can paint loading UI.
    const frame = requestAnimationFrame(() => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2");
      const available = Boolean(context);
      context?.getExtension("WEBGL_lose_context")?.loseContext();
      setSupported(available);
      if (!available) errorCallback.current?.();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleReady = useCallback(() => {
    setReady(true);
    externalReady?.();
  }, [externalReady]);
  const handleError = useCallback(() => {
    setFailed(true);
    externalError?.();
  }, [externalError]);

  if (supported === false || failed) return <Fallback />;

  return (
    <div
      className="scene-viewport"
      data-testid="scene-viewport"
      data-ready={ready}
    >
      {!ready && (
        <div className="scene-loading" role="status">
          <span />
          Preparing your observation
        </div>
      )}
      {supported && (
        <SceneBoundary onError={handleError}>
          <Canvas
            data-testid="saturn-canvas"
            aria-label="Interactive 3D Saturn system. Drag to orbit, scroll or pinch to zoom. Use the object cards and camera buttons for keyboard access."
            role="img"
            shadows
            dpr={[1, 1.75]}
            frameloop="demand"
            camera={{ position: DEFAULT_CAMERA, fov: 40, near: 0.05, far: 120 }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
            }}
            onCreated={({ gl }) => {
              gl.toneMapping = ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.1;
              gl.shadowMap.type = PCFSoftShadowMap;
              gl.setClearColor("#03060a", 0);
            }}
            fallback={<Fallback />}
          >
            <Suspense fallback={null}>
              <Scene {...props} onReady={handleReady} onError={handleError} />
            </Suspense>
          </Canvas>
        </SceneBoundary>
      )}
    </div>
  );
}
