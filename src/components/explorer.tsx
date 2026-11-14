"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { bodies, bodyOrder, type BodyId } from "@/data/bodies";
import {
  explorerReducer,
  initialState,
  type CameraAction,
} from "@/lib/explorer-state";
import { Icon, type IconName } from "./ui/icon";
import { Modal } from "./ui/modal";
import { FactsPanel } from "./hud/facts-panel";
import { ObjectDock } from "./hud/object-dock";
import { AboutContent, HelpContent } from "./hud/reference-content";

const SceneCanvas = dynamic(() => import("./scene/SceneCanvas"), {
  ssr: false,
  loading: () => (
    <div className="scene-loading" role="status">
      <span className="loading-orbit" />
      Opening the observatory
    </div>
  ),
});
export function Explorer() {
  const [state, dispatch] = useReducer(explorerReducer, initialState);
  const [panel, setPanel] = useState(false);
  const [modal, setModal] = useState<"about" | "help" | null>(null);
  const [view, setView] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [limit, setLimit] = useState<"near" | "far" | null>(null);
  const [hint, setHint] = useState(true);
  const infoRef = useRef<HTMLButtonElement>(null);
  const viewRef = useRef<HTMLButtonElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const body = bodies[state.selected];
  const handleReady = useCallback(() => setReady(true), []);
  const handleError = useCallback(() => setFailed(true), []);
  const handleCameraStatus = useCallback(
    (status: { limit: "near" | "far" | null }) => setLimit(status.limit),
    [],
  );
  const select = useCallback((id: BodyId) => {
    dispatch({ type: "select", id });
    setHint(false);
  }, []);
  const camera = useCallback((command: CameraAction) => {
    dispatch({ type: "camera", command });
    setHint(false);
  }, []);
  const closePanel = useCallback(() => {
    setPanel(false);
    requestAnimationFrame(() => infoRef.current?.focus());
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(media.matches);
      if (media.matches) dispatch({ type: "motion", enabled: false });
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setHint(false), 6500);
    return () => window.clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (modal) return;
      if (event.key === "Escape") {
        if (view) {
          setView(false);
          viewRef.current?.focus();
        } else if (panel) closePanel();
      }
      if (
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        /^[1-4]$/.test(event.key)
      ) {
        event.preventDefault();
        select(bodyOrder[Number(event.key) - 1]);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [modal, view, panel, select, closePanel]);
  useEffect(() => {
    if (!view) return;
    const outside = (event: PointerEvent) => {
      if (!viewMenuRef.current?.contains(event.target as Node)) setView(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [view]);
  function preset(command: CameraAction) {
    camera(command);
    setView(false);
    viewRef.current?.focus();
  }
  return (
    <main
      id="explorer"
      className="observatory"
      aria-label="Aether interactive observatory"
    >
      <a className="skip-link" href="#scene-navigation">
        Skip to 3D navigation
      </a>
      <div
        id="scene-navigation"
        className="scene-shell"
        role="group"
        aria-label="3D navigation viewport"
        tabIndex={0}
        onPointerDown={() => setHint(false)}
        onWheel={() => setHint(false)}
        onKeyDown={(event) => {
          const keys: Record<string, CameraAction> = {
            ArrowLeft: "orbit-left",
            ArrowRight: "orbit-right",
            ArrowUp: "orbit-up",
            ArrowDown: "orbit-down",
          };
          if (!failed && keys[event.key]) {
            event.preventDefault();
            camera(keys[event.key]);
          }
        }}
      >
        <SceneCanvas
          selected={state.selected}
          onSelect={select}
          motion={state.motion && !reducedMotion && !modal}
          reducedMotion={reducedMotion}
          command={state.command}
          inputEnabled={!modal}
          onReady={handleReady}
          onError={handleError}
          onCameraStatus={handleCameraStatus}
        />
      </div>
      <header className="hud-header pointer-events-none">
        <button
          className="brand pointer-events-auto"
          aria-label="Return to Saturn"
          onClick={() => {
            select("saturn");
            setPanel(false);
            setView(false);
          }}
        >
          <span className="brand-mark">Λ</span>
          <span>AETHER</span>
          <span className="brand-dot" />
        </button>
        <span className="system-location">SOL / SATURN SYSTEM</span>
        <div className="header-actions pointer-events-auto">
          <Control
            name="info"
            label="About Aether"
            onClick={() => {
              setView(false);
              setModal("about");
            }}
          />
          <button
            className="help-button"
            aria-label="Controls and accessibility"
            onClick={() => {
              setView(false);
              setModal("help");
            }}
          >
            ?
          </button>
        </div>
      </header>
      <div className="view-menu" ref={viewMenuRef}>
        <button
          ref={viewRef}
          className="view-toggle"
          aria-label="View options"
          aria-expanded={view}
          aria-controls="view-options"
          onClick={() => setView(!view)}
        >
          <Icon name="orbit" size={16} />
          <span>View</span>
          <Icon name="chevron" size={12} />
        </button>
        {view && (
          <div
            id="view-options"
            className="view-options"
            role="group"
            aria-label="View options"
          >
            <button disabled={failed} onClick={() => preset("top")}>
              <Icon name="expand" size={16} />
              View from above
            </button>
            <button disabled={failed} onClick={() => preset("angle")}>
              <Icon name="orbit" size={16} />
              Oblique view
            </button>
            <button
              disabled={failed || reducedMotion}
              aria-label={
                state.motion ? "Pause rotation" : "Enable slow rotation"
              }
              aria-pressed={state.motion}
              onClick={() =>
                dispatch({ type: "motion", enabled: !state.motion })
              }
            >
              <Icon name={state.motion ? "pause" : "play"} size={16} />
              {state.motion ? "Pause rotation" : "Slow rotation"}
            </button>
            {reducedMotion && <p>Reduced motion is enabled.</p>}
          </div>
        )}
      </div>
      <section
        className={`subject-hud ${panel ? "panel-open" : ""}`}
        aria-label="Selected object"
      >
        <span className="subject-index">
          {state.selected === "saturn" ? "06 / PLANET" : "SATURN / MOON"}
        </span>
        <div className="subject-title">
          <h1>{body.name}</h1>
          <button
            ref={infoRef}
            className="object-info"
            aria-label={`About ${body.name}`}
            aria-expanded={panel}
            aria-controls="object-facts"
            onClick={() => {
              setView(false);
              setPanel(!panel);
            }}
          >
            <Icon name="info" size={17} />
            <span>Object info</span>
          </button>
        </div>
        <p>{body.type}</p>
      </section>
      <div
        className="camera-controls"
        role="group"
        aria-label="Camera controls"
      >
        <Control
          name="plus"
          label="Zoom in"
          disabled={failed}
          onClick={() => camera("zoom-in")}
        />
        <Control
          name="minus"
          label="Zoom out"
          disabled={failed}
          onClick={() => camera("zoom-out")}
        />
        <span className="control-divider" />
        <Control
          name="reset"
          label="Reset camera"
          disabled={failed}
          onClick={() => camera("reset")}
        />
      </div>
      <div className="navigation-note" aria-live="polite">
        {failed
          ? "READING MODE"
          : limit === "near"
            ? "AVAILABLE DETAIL LIMIT"
            : limit === "far"
              ? "OVERVIEW LIMIT"
              : ready
                ? "ORBITAL VIEW"
                : "PREPARING 3D"}
        <span />
        ILLUSTRATIVE SCALE
      </div>
      {hint && ready && !failed && !panel && (
        <p className="gesture-hint">
          Drag to orbit <span>·</span> Scroll or pinch to zoom
        </p>
      )}
      <ObjectDock selected={state.selected} onSelect={select} />
      {panel && <FactsPanel body={body} onClose={closePanel} />}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "about" ? "A little perspective." : "Your controls."}
      >
        {modal === "about" ? <AboutContent /> : <HelpContent />}
      </Modal>
      <div className="sr-only" role="status" aria-live="polite">
        {body.name} selected.
        {failed ? " 3D is unavailable. All facts remain available." : ""}
      </div>
    </main>
  );
}
function Control({
  name,
  label,
  onClick,
  disabled,
}: {
  name: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="icon-button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={name} size={18} />
    </button>
  );
}
