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
import type { ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  DirectionalLight,
  Group,
  PCFSoftShadowMap,
  RingGeometry,
  SRGBColorSpace,
} from "three";
import MoonDestination from "@/components/lunar/MoonDestination";
import type { SurfaceStatus } from "@/lib/lunar/types";
import type { FlightInput } from "@/lib/lunar/types";
import type { SaturnBodyId } from "@/lib/scene-config";
import type { BodyId } from "@/data/bodies";
import { bodies, bodyOrder } from "@/data/bodies";
import {
  DEFAULT_CAMERA,
  RING_INNER_RADIUS,
  RING_OUTER_RADIUS,
  sceneBodies,
} from "@/lib/scene-config";

import { CameraRig, type CameraCommand, type CameraStatus } from "./CameraRig";
import {
  SphereDetailProvider,
  useSphereLod,
} from "@/components/scene-detail/sphere-lod";
export type { CameraCommand, CameraStatus } from "./CameraRig";

export interface SceneCanvasProps {
  selected: BodyId;
  onSelect: (id: BodyId) => void;
  motion: boolean;
  reducedMotion?: boolean;
  command: CameraCommand | null;
  onReady?: () => void;
  onError?: () => void;
  inputEnabled?: boolean;
  onCameraStatus?: (status: CameraStatus) => void;
  mode?: "orbit" | "surface";
  flightInput?: FlightInput;
  onSurfaceStatus?: (status: SurfaceStatus) => void;
}

function Fallback() {
  return (
    <div className="scene-fallback" role="status" data-testid="webgl-fallback">
      <div className="fallback-planet" aria-hidden="true" />
      <div className="fallback-message">
        <p>3D view unavailable</p>
        <span>
          Use the object selector and information panels to keep exploring.
        </span>
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
  const { meshRef, geometry: sphereGeometry } = useSphereLod("saturn", 2);
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
          ref={meshRef}
          geometry={sphereGeometry}
          scale={[2, 1.804, 2]}
          castShadow
          receiveShadow
          onClick={(event) => {
            event.stopPropagation();
            if (event.delta > 3) return;
            onSelect("saturn");
          }}
        >
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
  id: Exclude<SaturnBodyId, "saturn">;
  onSelect: SceneCanvasProps["onSelect"];
}) {
  const texture = useTexture(bodies[id].texture, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
    loaded.anisotropy = 4;
  });
  const body = sceneBodies[id];
  const { meshRef, geometry } = useSphereLod(id, body.radius);
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      scale={body.radius}
      position={body.position}
      castShadow
      receiveShadow
      onClick={(event) => {
        event.stopPropagation();
        if (event.delta > 3) return;
        onSelect(id);
      }}
    >
      <meshStandardMaterial map={texture} roughness={1} metalness={0} />
    </mesh>
  );
}

/** Three r182 lights do not dispose their own shadow render target. */
function SaturnSun() {
  const light = useRef<DirectionalLight>(null);
  useEffect(() => {
    const sun = light.current;
    return () => sun?.shadow.dispose();
  }, []);
  return (
    <directionalLight
      ref={light}
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
  }, [gl, invalidate, onReady, onError, props.selected, props.mode]);
  useEffect(() => {
    invalidate();
  }, [props.motion, invalidate]);

  if (props.selected === "moon")
    return (
      <>
        {props.mode !== "surface" && <Stars />}
        <MoonDestination
          command={props.command}
          mode={props.mode}
          reducedMotion={props.reducedMotion}
          inputEnabled={props.inputEnabled}
          flightInput={props.flightInput}
          onSurfaceStatus={props.onSurfaceStatus}
          onCameraStatus={props.onCameraStatus}
        />
      </>
    );
  return (
    <>
      <ambientLight intensity={0.16} color="#b4c4df" />
      <SaturnSun />
      <Stars />
      <SphereDetailProvider>
        <Saturn onSelect={props.onSelect} motion={props.motion} />
        {bodyOrder
          .filter(
            (id): id is Exclude<SaturnBodyId, "saturn"> =>
              id !== "saturn" && id !== "moon",
          )
          .map((id) => (
            <Moon key={id} id={id} onSelect={props.onSelect} />
          ))}
      </SphereDetailProvider>
      <CameraRig
        selected={props.selected}
        command={props.command}
        reducedMotion={props.reducedMotion}
        inputEnabled={props.inputEnabled}
        onCameraStatus={props.onCameraStatus}
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
            aria-label={
              props.selected === "moon"
                ? props.mode === "surface"
                  ? "Interactive lunar terrain. Drag to look, use flight controls or W A S D to move, Q and E to descend and ascend."
                  : "Interactive 3D Moon. Drag to orbit, scroll or pinch to zoom. Approach Aristarchus to explore terrain."
                : "Interactive 3D Saturn system. Drag to orbit, scroll or pinch to zoom. Use the object cards and camera buttons for keyboard access."
            }
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
