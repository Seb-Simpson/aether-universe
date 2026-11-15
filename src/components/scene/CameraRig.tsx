"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ComponentRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Spherical, Vector3 } from "three";
import type { SaturnBodyId } from "@/lib/scene-config";
import {
  DEFAULT_CAMERA,
  fitRadiusDistance,
  RING_OUTER_RADIUS,
  sceneBodies,
} from "@/lib/scene-config";
import {
  CAMERA_MODE,
  applyClippingRange,
  cameraBounds,
  cameraClearance,
  cameraSegmentIsClear,
  transferWaypoints,
} from "@/lib/camera-policy";

export type CameraCommand = {
  type:
    | "zoom-in"
    | "zoom-out"
    | "reset"
    | "top"
    | "angle"
    | "orbit-left"
    | "orbit-right"
    | "orbit-up"
    | "orbit-down"
    | "approach-region";
  nonce: number;
};
export interface CameraStatus {
  limit: "near" | "far" | null;
}
export interface CameraRigProps {
  selected: SaturnBodyId;
  command: CameraCommand | null;
  reducedMotion?: boolean;
  inputEnabled?: boolean;
  onCameraStatus?: (status: CameraStatus) => void;
}

export function CameraRig({
  selected,
  command,
  reducedMotion = false,
  inputEnabled = true,
  onCameraStatus,
}: CameraRigProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, gl, invalidate, size } = useThree();
  const fov = camera instanceof PerspectiveCamera ? camera.fov : 40;
  const bounds = useMemo(
    () =>
      cameraBounds(
        selected,
        fov,
        size.width / size.height,
        size.height,
        gl.getPixelRatio(),
      ),
    [selected, fov, size.width, size.height, gl],
  );
  const path = useRef<Vector3[]>([]);
  const destination = useRef(new Vector3(...DEFAULT_CAMERA));
  const targetDestination = useRef(new Vector3());
  const initialized = useRef(false);
  const automatic = useRef(true);
  const lastCommand = useRef<number | null>(null);
  const lastLimit = useRef<CameraStatus["limit"] | undefined>(undefined);
  const statusCallback = useRef(onCameraStatus);
  const visible = useRef(true);
  const frameCount = useRef(0);
  const scratch = useMemo(
    () => ({
      previousEye: new Vector3(...DEFAULT_CAMERA),
      previousTarget: new Vector3(),
      safeEye: new Vector3(...DEFAULT_CAMERA),
      safeTarget: new Vector3(),
      offset: new Vector3(),
      next: new Vector3(),
      sphere: new Spherical(),
    }),
    [],
  );
  useEffect(() => {
    statusCallback.current = onCameraStatus;
  }, [onCameraStatus]);

  const stopMomentum = useCallback(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const damping = orbit.enableDamping;
    orbit.enableDamping = false;
    orbit.update();
    orbit.enableDamping = damping;
  }, []);

  const begin = useCallback(
    (eye: Vector3, target: Vector3) => {
      const orbit = controls.current;
      if (!orbit) return;
      // This rig can mount after a metre-based lunar frame; never interpolate
      // that unrelated coordinate system into the Saturn scene.
      if (!initialized.current) camera.position.set(...DEFAULT_CAMERA);
      // Discard old rotational inertia before a deterministic focus or preset.
      stopMomentum();
      if (cameraClearance(camera.position) < 0)
        camera.position.copy(scratch.safeEye);
      if (cameraClearance(eye) < 0) return;
      targetDestination.current.copy(target);
      destination.current.copy(eye);
      path.current = transferWaypoints(camera.position, eye);
      if (!path.current.length && camera.position.distanceTo(eye) > 0.001)
        return;
      automatic.current = true;
      initialized.current = true;
      orbit.minDistance = 0.01;
      orbit.maxDistance = Infinity;
      if (reducedMotion) {
        // No intermediate frame is rendered in a reduced-motion focus jump.
        camera.position.copy(eye);
        orbit.target.copy(target);
        orbit.update();
        scratch.safeEye.copy(eye);
        scratch.safeTarget.copy(target);
        path.current = [];
        automatic.current = false;
      }
      invalidate();
    },
    [camera, reducedMotion, stopMomentum, scratch, invalidate],
  );

  const resetPose = useCallback(() => {
    const target = new Vector3(...sceneBodies[selected].position);
    const direction =
      selected === "saturn"
        ? new Vector3(...DEFAULT_CAMERA).normalize()
        : new Vector3(0, 0.22, 1).normalize();
    begin(target.clone().addScaledVector(direction, bounds.overview), target);
  }, [selected, bounds.overview, begin]);

  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      applyClippingRange(camera, sceneBodies[selected].radius);
    }
    resetPose();
  }, [selected, camera, resetPose]);

  useEffect(() => {
    if (!command || command.nonce === lastCommand.current || !controls.current)
      return;
    lastCommand.current = command.nonce;
    const orbit = controls.current;
    if (command.type === "reset") {
      resetPose();
      return;
    }
    const target = new Vector3(...sceneBodies[selected].position);
    const eye = automatic.current
      ? destination.current.clone()
      : camera.position.clone();
    const offset = eye.sub(target);
    if (command.type === "top" || command.type === "angle") {
      const radius =
        selected === "saturn"
          ? RING_OUTER_RADIUS
          : sceneBodies[selected].radius;
      const fit = fitRadiusDistance(radius, fov, size.width / size.height);
      const distance = MathUtils.clamp(
        Math.max(offset.length(), fit, bounds.min),
        bounds.min,
        bounds.max,
      );
      offset
        .set(
          0,
          command.type === "top" ? 1 : 0.31,
          command.type === "top" ? 0.05 : 1,
        )
        .normalize()
        .multiplyScalar(distance);
    } else if (command.type === "zoom-in" || command.type === "zoom-out") {
      offset.setLength(
        MathUtils.clamp(
          offset.length() * (command.type === "zoom-in" ? 0.82 : 1.22),
          bounds.min,
          bounds.max,
        ),
      );
    } else {
      const sphere = new Spherical().setFromVector3(offset);
      if (command.type === "orbit-left") sphere.theta -= 0.14;
      if (command.type === "orbit-right") sphere.theta += 0.14;
      if (command.type === "orbit-up")
        sphere.phi = Math.max(0.08, sphere.phi - 0.14);
      if (command.type === "orbit-down")
        sphere.phi = Math.min(Math.PI - 0.08, sphere.phi + 0.14);
      offset.setFromSpherical(sphere);
    }
    begin(target.clone().add(offset), target);
    // Ensure a rejected collision command still wakes telemetry and controls.
    orbit.enabled = inputEnabled && visible.current;
    invalidate();
  }, [
    command,
    selected,
    camera,
    bounds,
    fov,
    size.width,
    size.height,
    inputEnabled,
    begin,
    resetPose,
    invalidate,
  ]);

  useEffect(() => {
    const update = () => {
      visible.current = !document.hidden;
      if (controls.current) {
        controls.current.enabled = inputEnabled && visible.current;
        if (!controls.current.enabled) {
          scratch.next.copy(camera.position);
          scratch.offset.copy(controls.current.target);
          stopMomentum();
          camera.position.copy(scratch.next);
          controls.current.target.copy(scratch.offset);
          controls.current.update();
        }
      }
      invalidate();
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [inputEnabled, invalidate, stopMomentum, scratch, camera]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    if (automatic.current && visible.current && inputEnabled) {
      const waypoint = path.current[0];
      const amount = 1 - Math.exp(-Math.min(delta, 0.1) * 6.5);
      if (waypoint) {
        scratch.next.copy(camera.position).lerp(waypoint, amount);
        // Every interpolation step is swept, independent of rendering FPS.
        if (cameraSegmentIsClear(camera.position, scratch.next))
          camera.position.copy(scratch.next);
        else {
          path.current = [];
          automatic.current = false;
        }
        if (camera.position.distanceTo(waypoint) < 0.015) {
          camera.position.copy(waypoint);
          path.current.shift();
        }
      }
      orbit.target.lerp(targetDestination.current, amount);
      orbit.update();
      if (
        !path.current.length &&
        orbit.target.distanceTo(targetDestination.current) < 0.001
      ) {
        orbit.target.copy(targetDestination.current);
        automatic.current = false;
      }
      invalidate();
    }
    // Validate the result after OrbitControls updates as well as our own tween.
    if (
      cameraClearance(camera.position) < -1e-6 ||
      !cameraSegmentIsClear(scratch.safeEye, camera.position)
    ) {
      stopMomentum();
      camera.position.copy(scratch.safeEye);
      orbit.target.copy(scratch.safeTarget);
      orbit.update();
      automatic.current = false;
      path.current = [];
    }
    if (!automatic.current) {
      orbit.minDistance = bounds.min;
      orbit.maxDistance = bounds.max;
      const offset = scratch.offset.copy(camera.position).sub(orbit.target);
      const distance = offset.length();
      if (distance < bounds.min - 1e-6 || distance > bounds.max + 1e-6) {
        offset.setLength(MathUtils.clamp(distance, bounds.min, bounds.max));
        scratch.next.copy(orbit.target).add(offset);
        if (cameraClearance(scratch.next) >= 0)
          camera.position.copy(scratch.next);
        orbit.update();
      }
    }
    // OrbitControls can also adjust the eye while applying angle constraints.
    // Validate the final rendered pose, including automatic transfers, rather
    // than relying only on the proposed interpolation segment.
    if (
      cameraClearance(camera.position) < -1e-6 ||
      !cameraSegmentIsClear(scratch.safeEye, camera.position)
    ) {
      stopMomentum();
      camera.position.copy(scratch.safeEye);
      orbit.target.copy(scratch.safeTarget);
      path.current = [];
      automatic.current = false;
      orbit.update();
    }
    const moved =
      camera.position.distanceTo(scratch.previousEye) > 0.0005 ||
      orbit.target.distanceTo(scratch.previousTarget) > 0.0005;
    if (moved && !automatic.current) invalidate();
    scratch.previousEye.copy(camera.position);
    scratch.previousTarget.copy(orbit.target);
    if (cameraClearance(camera.position) >= -1e-6) {
      scratch.safeEye.copy(camera.position);
      scratch.safeTarget.copy(orbit.target);
    }
    const distance = camera.position.distanceTo(orbit.target);
    const limit: CameraStatus["limit"] = automatic.current
      ? null
      : distance <= bounds.min * 1.005
        ? "near"
        : distance >= bounds.max * 0.995
          ? "far"
          : null;
    if (limit !== lastLimit.current) {
      lastLimit.current = limit;
      statusCallback.current?.({ limit });
    }
    frameCount.current++;
    const attributes = {
      "data-camera-settled": String(
        initialized.current && !automatic.current && !moved,
      ),
      "data-camera-transition": String(automatic.current),
      "data-camera-distance": distance.toFixed(4),
      "data-camera-polar": orbit.getPolarAngle().toFixed(4),
      "data-camera-min": bounds.min.toFixed(4),
      "data-camera-max": bounds.max.toFixed(4),
      "data-camera-clearance": cameraClearance(camera.position).toFixed(5),
      "data-camera-limit": limit ?? "",
      "data-camera-mode": CAMERA_MODE,
      "data-camera-focus-error": orbit.target
        .distanceTo(targetDestination.current)
        .toFixed(5),
      "data-selected": selected,
      "data-render-calls": String(gl.info.render.calls),
      "data-triangles": String(gl.info.render.triangles),
      "data-geometries": String(gl.info.memory.geometries),
      "data-textures": String(gl.info.memory.textures),
      "data-frame": String(frameCount.current),
    };
    for (const [key, value] of Object.entries(attributes))
      gl.domElement.setAttribute(key, value);
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={inputEnabled}
      enablePan={false}
      enableDamping={!reducedMotion}
      dampingFactor={0.12}
      minDistance={0.01}
      maxDistance={Infinity}
      minPolarAngle={0.08}
      maxPolarAngle={Math.PI - 0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.8}
      onStart={() => {
        automatic.current = false;
        path.current = [];
        const orbit = controls.current;
        if (orbit) {
          scratch.next.copy(camera.position);
          stopMomentum();
          camera.position.copy(scratch.next);
          orbit.minDistance = 0.01;
          orbit.maxDistance = Infinity;
          orbit.target.set(...sceneBodies[selected].position);
          targetDestination.current.copy(orbit.target);
          orbit.update();
          orbit.minDistance = bounds.min;
          orbit.maxDistance = bounds.max;
          scratch.safeEye.copy(camera.position);
          scratch.safeTarget.copy(orbit.target);
          invalidate();
        }
      }}
      onChange={() => invalidate()}
    />
  );
}
