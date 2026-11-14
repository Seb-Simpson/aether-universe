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

const SceneCanvas = dynamic(() => import("./scene/SceneCanvas"), {
  ssr: false,
  loading: () => (
    <div className="scene-loading" role="status">
      <span className="loading-orbit" />
      Opening the observatory
    </div>
  ),
});
const taglines: Record<BodyId, React.ReactNode> = {
  saturn: (
    <>
      Not all wonders
      <br />
      are on Earth.
    </>
  ),
  titan: (
    <>
      An atmosphere
      <br />
      of possibility.
    </>
  ),
  enceladus: (
    <>
      A small moon.
      <br />A deeper mystery.
    </>
  ),
  rhea: (
    <>
      An ancient world,
      <br />
      written in ice.
    </>
  ),
};
const cards: Record<BodyId, string> = {
  saturn: "The ringed giant",
  titan: "Beyond the haze",
  enceladus: "An ocean beneath",
  rhea: "A world of ancient ice",
};

export function Explorer() {
  const [state, dispatch] = useReducer(explorerReducer, initialState);
  const [panel, setPanel] = useState(false);
  const [modal, setModal] = useState<"about" | "help" | null>(null);
  const [menu, setMenu] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const body = bodies[state.selected];
  const handleReady = useCallback(() => setSceneReady(true), []);
  const handleError = useCallback(() => setSceneFailed(true), []);
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
    if (panel) panelRef.current?.focus();
  }, [panel]);
  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [menu]);
  function select(id: BodyId) {
    dispatch({ type: "select", id });
  }
  function selectFromCard(id: BodyId) {
    select(id);
    // Return the newly focused world to view after using the mobile object strip.
    if (window.matchMedia("(max-width: 760px)").matches) {
      document.getElementById("explorer")?.scrollIntoView({
        behavior: reducedMotion ? "instant" : "smooth",
        block: "start",
      });
    }
  }
  function camera(command: CameraAction) {
    dispatch({ type: "camera", command });
  }
  function closePanel() {
    setPanel(false);
    infoButtonRef.current?.focus();
  }
  return (
    <>
      <a className="skip-link" href="#explorer">
        Skip to explorer
      </a>
      <header className="site-header">
        <a className="wordmark" href="#" aria-label="Aether home">
          <span className="brand-symbol">Λ</span>AETHER
          <span className="wordmark-dot" />
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <div className="destination-menu" ref={menuRef}>
            <button
              className={`nav-link ${menu ? "active" : ""}`}
              aria-expanded={menu}
              aria-controls="destinations"
              onClick={() => setMenu(!menu)}
            >
              Explore <Icon name="chevron" size={13} />
            </button>
            {menu && (
              <div id="destinations" className="destination-popover">
                <span className="eyebrow">YOUR NEXT PERSPECTIVE</span>
                <button
                  onClick={() => {
                    select("saturn");
                    setPanel(false);
                    setMenu(false);
                    document
                      .getElementById("explorer")
                      ?.scrollIntoView({
                        behavior: reducedMotion ? "instant" : "smooth",
                      });
                  }}
                >
                  <span className="tiny-planet" />
                  Saturn system
                  <Icon name="arrow" size={16} />
                </button>
                <p>
                  One world, countless discoveries.
                  <br />
                  More destinations in future releases.
                </p>
              </div>
            )}
          </div>
          <a className="nav-link" href="#field-guide">
            Field guide
          </a>
          <button className="nav-link" onClick={() => setModal("about")}>
            About Aether
          </button>
        </nav>
        <span className="header-note">
          <span className="status-dot" />A DIFFERENT PERSPECTIVE
        </span>
      </header>
      <main>
        <section
          id="explorer"
          className={`explorer ${panel ? "has-panel" : ""}`}
          aria-label="Interactive Saturn explorer"
        >
          <div className="starfield" aria-hidden="true" />
          <div className="scene-shell" aria-label={`3D view of ${body.name}`}>
            <SceneCanvas
              selected={state.selected}
              onSelect={select}
              motion={state.motion && !reducedMotion}
              reducedMotion={reducedMotion}
              command={state.command}
              onReady={handleReady}
              onError={handleError}
            />
          </div>
          <div className="scene-topline" aria-hidden="true">
            <span>
              <span className="status-dot" />
              SATURN SYSTEM
            </span>
            <span>EST. 4.5 BILLION YEARS AGO</span>
          </div>
          <div
            className="hero-copy"
            data-body={state.selected}
            key={state.selected}
          >
            <p className="eyebrow">
              <span className="eyebrow-line" />{" "}
              {state.selected === "saturn"
                ? "06 / THE SOLAR SYSTEM"
                : "SATURN / NATURAL SATELLITE"}
            </p>
            <h1>
              {body.name}
              <span className="title-period">.</span>
            </h1>
            <p className="hero-tagline">{taglines[state.selected]}</p>
            <p className="hero-description">
              {state.selected === "saturn"
                ? "Journey to the ringed giant. Drift through a world of ice, cloud, and extraordinary possibility."
                : body.description}
            </p>
            <button
              ref={infoButtonRef}
              className="primary-button"
              aria-expanded={panel}
              onClick={() => setPanel(!panel)}
            >
              Explore {body.name}
              <span>
                <Icon name="arrow" size={18} />
              </span>
            </button>
            <p className="interaction-hint">
              <Icon name="orbit" size={16} /> YOUR OWN LITTLE SPACE EXPEDITION
            </p>
          </div>
          {!panel && (
            <div className="object-label" aria-hidden="true">
              <span className="label-cross">+</span>
              <span>
                {body.name.toUpperCase()}
                <small>{body.type}</small>
              </span>
            </div>
          )}
          <div className="scene-meta">
            <span className="live-indicator" />
            {sceneFailed
              ? "READING MODE"
              : sceneReady
                ? "INTERACTIVE 3D"
                : "PREPARING 3D"}
            <span className="meta-divider" />
            ILLUSTRATIVE SCALE
          </div>
          <div
            className="scene-controls"
            role="group"
            aria-label="Camera controls"
          >
            <div className="view-controls">
              <Control
                name="orbit"
                label="Oblique view"
                onClick={() => camera("angle")}
                disabled={sceneFailed}
              />
              <Control
                name="expand"
                label="View from above"
                onClick={() => camera("top")}
                disabled={sceneFailed}
              />
            </div>
            <div className="zoom-controls">
              <Control
                name="plus"
                label="Zoom in"
                onClick={() => camera("zoom-in")}
                disabled={sceneFailed}
              />
              <Control
                name="minus"
                label="Zoom out"
                onClick={() => camera("zoom-out")}
                disabled={sceneFailed}
              />
              <Control
                name="reset"
                label="Reset camera"
                onClick={() => camera("reset")}
                disabled={sceneFailed}
              />
            </div>
            <Control
              name={state.motion ? "pause" : "play"}
              label={state.motion ? "Pause rotation" : "Enable slow rotation"}
              pressed={state.motion}
              onClick={() =>
                dispatch({ type: "motion", enabled: !state.motion })
              }
              disabled={sceneFailed || reducedMotion}
            />
            <Control
              name="info"
              label="Controls and accessibility"
              onClick={() => setModal("help")}
            />
          </div>
          <div className="drag-hint">
            <span>DRAG TO ORBIT</span>
            <span className="hint-dot" />
            <span>SCROLL TO ZOOM</span>
          </div>
          {panel && (
            <aside
              className="fact-panel"
              ref={panelRef}
              tabIndex={-1}
              role="region"
              aria-label={`About ${body.name}`}
              onKeyDown={(e) => {
                if (e.key === "Escape") closePanel();
              }}
            >
              <div className="panel-heading">
                <p className="eyebrow">A CLOSER LOOK</p>
                <button
                  className="icon-button"
                  onClick={closePanel}
                  aria-label="Close information panel"
                >
                  <Icon name="close" />
                </button>
              </div>
              <h2>{body.name}</h2>
              <p className="panel-type">{body.type}</p>
              <p className="panel-description">{body.description}</p>
              <dl className="fact-list">
                {body.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>
                      {fact.value}
                      <a
                        href={
                          body.sources.find((s) => s.id === fact.source)?.url
                        }
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Source for ${fact.label} (opens in new tab)`}
                      >
                        <Icon name="external" size={12} />
                      </a>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="source-note">Verified references</p>
              <div className="source-links">
                {body.sources.map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.title}
                    <Icon name="external" size={12} />
                  </a>
                ))}
              </div>
              <p className="scale-note">
                An encounter, not a simulation. Sizes and distances are adjusted
                for exploration. Moon positions are illustrative.
              </p>
            </aside>
          )}
        </section>
        <section
          className="body-navigation"
          aria-label="Select a celestial body"
        >
          <div className="body-nav-caption">
            <span className="eyebrow">LOOK A LITTLE CLOSER</span>
            <p>One remarkable system.</p>
          </div>
          <div className="body-cards">
            {bodyOrder.map((id, index) => (
              <button
                key={id}
                className={`body-card ${state.selected === id ? "selected" : ""}`}
                aria-label={`Select ${bodies[id].name}`}
                aria-pressed={state.selected === id}
                onClick={() => selectFromCard(id)}
              >
                <span
                  className={`body-thumbnail thumbnail-${id}`}
                  aria-hidden="true"
                >
                  <span
                    style={{ backgroundImage: `url(${bodies[id].texture})` }}
                  />
                </span>
                <span className="body-card-copy">
                  <span className="body-card-number">
                    0{index + 1}{" "}
                    <span>{id === "saturn" ? "PLANET" : "MOON"}</span>
                  </span>
                  <strong>{bodies[id].name}</strong>
                  <small>{cards[id]}</small>
                </span>
                <span className="card-arrow">
                  <Icon name="arrow" size={17} />
                </span>
              </button>
            ))}
          </div>
        </section>
        <div className="explorer-footnote">
          <span>MADE FOR THE CURIOUS.</span>
          <a href="#field-guide">
            The discovery continues <span>↓</span>
          </a>
          <span>SCIENCE, WITH A SENSE OF WONDER.</span>
        </div>
        <section
          id="field-guide"
          className="field-guide"
          aria-labelledby="guide-title"
        >
          <div className="guide-intro">
            <p className="eyebrow">THE FIELD GUIDE / 001</p>
            <h2 id="guide-title">
              Extraordinary,
              <br />
              <em>by nature.</em>
            </h2>
            <p>
              The closer you look, the more there is to discover.
              <br />A few things to take with you on your journey.
            </p>
          </div>
          <div className="guide-grid">
            <article className="guide-card">
              <span className="guide-number">01 / THE RINGS</span>
              <div className="ring-illustration" aria-hidden="true">
                <span />
                <span />
                <span />
                <i />
              </div>
              <h3>A world wearing ice.</h3>
              <p>
                Saturn’s rings are made of countless pieces of ice and rock. The
                dark Cassini Division separates its bright A and B rings.
              </p>
              <a
                href="https://science.nasa.gov/saturn/facts/"
                target="_blank"
                rel="noreferrer"
              >
                Discover the rings at NASA <Icon name="external" size={14} />
              </a>
            </article>
            <article className="guide-card">
              <span className="guide-number">02 / THE MOONS</span>
              <div className="moon-illustration" aria-hidden="true">
                <span className="guide-moon titan" />
                <span className="guide-moon enceladus" />
                <span className="guide-moon rhea" />
              </div>
              <h3>Many worlds. One family.</h3>
              <p>
                From Titan’s thick atmosphere to the ocean hidden inside
                Enceladus, Saturn’s moons are destinations in their own right.
              </p>
              <button
                onClick={() => {
                  select("titan");
                  setPanel(true);
                  document
                    .getElementById("explorer")
                    ?.scrollIntoView({
                      behavior: reducedMotion ? "instant" : "smooth",
                    });
                }}
              >
                Meet Titan <Icon name="arrow" size={15} />
              </button>
            </article>
            <article className="guide-card">
              <span className="guide-number">03 / THE MISSION</span>
              <div className="mission-illustration" aria-hidden="true">
                <span className="mission-line" />
                <Icon name="orbit" size={72} />
                <span className="mission-year">1997 — 2017</span>
              </div>
              <h3>Through Cassini’s eyes.</h3>
              <p>
                For 13 years in orbit, the Cassini spacecraft transformed our
                understanding of Saturn. Its discoveries inspire this
                experience.
              </p>
              <a
                href="https://science.nasa.gov/mission/cassini/"
                target="_blank"
                rel="noreferrer"
              >
                Explore the Cassini mission <Icon name="external" size={14} />
              </a>
            </article>
          </div>
          <div className="honesty-note">
            <Icon name="info" size={17} />
            <p>
              A little perspective: this is a curated visual experience. Surface
              maps come from NASA and Solar System Scope; lighting and
              composition are artistic. It is not a live view or a true-scale
              orbital model.
            </p>
            <button onClick={() => setModal("about")}>
              Sources & credits <Icon name="arrow" size={15} />
            </button>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <a className="wordmark" href="#">
          Λ AETHER
        </a>
        <p>A little closer to the extraordinary.</p>
        <span>EARTH, SOLAR SYSTEM</span>
      </footer>
      <div className="sr-only" role="status" aria-live="polite">
        {body.name} selected.{" "}
        {sceneFailed ? "3D is unavailable. All facts remain available." : ""}
      </div>
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={
          modal === "about" ? "A little perspective." : "Make yourself at home."
        }
      >
        {modal === "about" ? (
          <>
            <p className="modal-lead">
              AETHER is a small observatory for a very big universe.
            </p>
            <p>
              Explore Saturn and three of its remarkable moons through an
              interactive, artistically composed 3D scene and independently
              sourced facts.
            </p>
            <h3>Science & representation</h3>
            <p>
              Moon sizes and distances are exaggerated for visibility. Positions
              are illustrative, and slow rotation is for viewing only. Saturn’s
              oblateness and major ring divisions are represented; this is not a
              physical simulation.
            </p>
            <h3>Sources & image credits</h3>
            <p>
              Saturn and ring maps:{" "}
              <a
                href="https://www.solarsystemscope.com/textures/"
                target="_blank"
                rel="noreferrer"
              >
                Solar System Scope
              </a>
              ,{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>
              . Moon maps: NASA/JPL-Caltech, via{" "}
              <a
                href="https://github.com/nasa/NASA-3D-Resources"
                target="_blank"
                rel="noreferrer"
              >
                NASA 3D Resources
              </a>
              . Manrope font by Mikhail Sharanda and contributors, SIL Open Font
              License.
            </p>
            <ul className="modal-sources">
              {bodyOrder.map((id) => (
                <li key={id}>
                  <a
                    href={bodies[id].sources[0].url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {bodies[id].name} — NASA reference{" "}
                    <Icon name="external" size={13} />
                  </a>
                </li>
              ))}
            </ul>
            <p className="scale-note">
              No account, no paid API, no live location data. Just a different
              perspective.
            </p>
          </>
        ) : (
          <>
            <p className="modal-lead">A few simple ways to explore.</p>
            <dl className="help-list">
              <div>
                <dt>Orbit</dt>
                <dd>Drag the scene with a mouse or one finger.</dd>
              </div>
              <div>
                <dt>Zoom</dt>
                <dd>
                  Scroll over the scene, pinch with two fingers, or use the +
                  and − buttons.
                </dd>
              </div>
              <div>
                <dt>Find a world</dt>
                <dd>
                  Select Saturn or a moon in the strip below the scene. You can
                  also select a body directly in 3D.
                </dd>
              </div>
              <div>
                <dt>Change perspective</dt>
                <dd>
                  Use Oblique view or View from above. Reset camera returns to
                  the selected body.
                </dd>
              </div>
              <div>
                <dt>Keyboard</dt>
                <dd>
                  Tab moves between controls; Enter or Space activates buttons.
                  Escape closes dialogs and the information panel.
                </dd>
              </div>
              <div>
                <dt>Motion</dt>
                <dd>
                  Slow rotation is off by default. Your reduced-motion setting
                  disables it. You can still move the camera manually.
                </dd>
              </div>
            </dl>
            <p className="scale-note">
              All facts and references remain available if your device cannot
              display 3D.
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
function Control({
  name,
  label,
  onClick,
  disabled,
  pressed,
}: {
  name: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      className="icon-button control-button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={name} size={18} />
    </button>
  );
}
