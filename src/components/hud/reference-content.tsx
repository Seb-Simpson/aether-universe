import { bodies, bodyOrder } from "@/data/bodies";
import { Icon } from "@/components/ui/icon";
export function AboutContent() {
  return (
    <>
      <p className="modal-lead">A small observatory for a very big universe.</p>
      <p>
        Explore Saturn, Titan, Enceladus, Rhea and Earth’s Moon. The Saturn
        composition has exaggerated moon sizes/spacing and fixed positions; it
        is not an ephemeris. Earth’s Moon uses a separate reference frame with
        correct spherical proportions.
      </p>
      <h3>Real lunar terrain</h3>
      <p>
        Aristarchus is a bounded 60 km region at 23.7°N, 47.5°W. SLDEM2015
        measured elevations drive the mesh without vertical exaggeration;
        effective source detail is roughly 60–100 m. LROC WAC imagery is 100
        m-class and includes source illumination. It is not metre-detail ground
        photography.
      </p>
      <p>
        Progressively finer tiles add real geometric and image samples as you
        descend. Flight collision samples the same elevation grid and respects
        coarse fallback geometry. Outside the study area a reference sphere
        supplies distant context, not measured terrain. There is no walking
        mode.
      </p>
      <h3>Sources & credits</h3>
      <p>
        Lunar heights:{" "}
        <a
          href="https://pgda.gsfc.nasa.gov/products/54"
          target="_blank"
          rel="noreferrer"
        >
          SLDEM2015 — NASA/GSFC/MIT and JAXA/SELENE
        </a>
        . Regional imagery:{" "}
        <a
          href="https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLOBAL/"
          target="_blank"
          rel="noreferrer"
        >
          NASA/GSFC/ASU LROC WAC
        </a>
        . Globe, Saturn and rings:{" "}
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
        . Saturn-moon maps: NASA/JPL-Caltech through{" "}
        <a
          href="https://github.com/nasa/NASA-3D-Resources"
          target="_blank"
          rel="noreferrer"
        >
          NASA 3D Resources
        </a>
        . Manrope: Mikhail Sharanda and contributors, SIL OFL.
      </p>
      <ul className="modal-sources">
        {bodyOrder.map((id) => (
          <li key={id}>
            <a
              href={bodies[id].sources[0].url}
              target="_blank"
              rel="noreferrer"
            >
              {bodies[id].name} — NASA reference
              <Icon name="external" size={13} />
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
export function HelpContent() {
  return (
    <>
      <p className="modal-lead">Choose a world. Find your perspective.</p>
      <dl className="help-list">
        <div>
          <dt>Orbit</dt>
          <dd>
            Drag with a mouse or one finger. Focus the scene with Tab and use
            arrow keys to orbit. Scroll or pinch to zoom; + / − are
            alternatives.
          </dd>
        </div>
        <div>
          <dt>Moon</dt>
          <dd>
            Select Moon, choose Approach region, then Explore surface to fly
            over Aristarchus. Return to orbit restores the globe.
          </dd>
        </div>
        <div>
          <dt>Flight</dt>
          <dd>
            Drag to look. W/A/S/D or arrows move horizontally, E/Q ascend or
            descend. Hold the flight-pad buttons on mobile. Pinch, scroll or + /
            − to approach or rise. The available study area is bounded.
          </dd>
        </div>
        <div>
          <dt>Focus</dt>
          <dd>
            Select any destination in the dock, or press 1–5 outside dialogs.
            Reset restores the selected object or high regional view.
          </dd>
        </div>
        <div>
          <dt>Keyboard</dt>
          <dd>
            Tab moves through controls; Enter or Space activates them. Escape
            closes optional information, menus and dialogs.
          </dd>
        </div>
        <div>
          <dt>Motion</dt>
          <dd>
            Rotation starts off. Reduced motion disables optional rotation and
            easing; manual flight remains under your control. Help pauses camera
            input.
          </dd>
        </div>
      </dl>
      <p className="scale-note">
        If WebGL is lost, facts remain accessible. Retry 3D recreates the scene.
        Only optional panels scroll.
      </p>
    </>
  );
}
