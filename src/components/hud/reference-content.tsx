import { bodies, bodyOrder } from "@/data/bodies";
import { Icon } from "@/components/ui/icon";
export function AboutContent() {
  return (
    <>
      <p className="modal-lead">A small observatory for a very big universe.</p>
      <p>
        Explore Saturn, Titan, Enceladus and Rhea. The scene is an artistic
        composition with exaggerated moon sizes and spacing, fixed positions,
        and illustrative lighting. Optional rotation is for viewing, not a
        real-time clock.
      </p>
      <h3>What you can see</h3>
      <p>
        Saturn’s oblateness and major ring divisions are represented. Colour
        maps have finite resolution; zoom stops before surface navigation.
        Titan’s map shows its haze, not an unobscured surface. There is no
        terrain elevation or landing system in this release.
      </p>
      <h3>Sources & credits</h3>
      <p>
        Saturn and rings:{" "}
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
        . Moon maps: NASA/JPL-Caltech via{" "}
        <a
          href="https://github.com/nasa/NASA-3D-Resources"
          target="_blank"
          rel="noreferrer"
        >
          NASA 3D Resources
        </a>
        . Manrope font by Mikhail Sharanda and contributors, SIL OFL.
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
      <p className="scale-note">
        No account, paid API or live location data. More destinations can join
        this observatory in future releases.
      </p>
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
            Drag the scene with a mouse or one finger. Focus the scene with Tab
            and use the arrow keys to orbit.
          </dd>
        </div>
        <div>
          <dt>Zoom</dt>
          <dd>
            Scroll, pinch with two fingers, or use + / −. Zoom stops at the
            available-detail limit; these maps do not support surface travel.
          </dd>
        </div>
        <div>
          <dt>Focus</dt>
          <dd>
            Select a body in the dock or directly in 3D. Reset camera returns to
            a framed view of that body.
          </dd>
        </div>
        <div>
          <dt>Perspective</dt>
          <dd>
            View options contains overhead and oblique presets and optional slow
            rotation.
          </dd>
        </div>
        <div>
          <dt>Keyboard</dt>
          <dd>
            Tab moves through controls. Enter or Space activates them. Escape
            closes panels, menus and dialogs. Keys 1–4 select bodies outside
            dialogs.
          </dd>
        </div>
        <div>
          <dt>Motion</dt>
          <dd>
            Rotation starts off. Reduced motion disables optional rotation and
            camera easing. Menus stay still while you read.
          </dd>
        </div>
      </dl>
      <p className="scale-note">
        If WebGL is unavailable, object facts and references remain accessible.
        Only optional panels scroll; the explorer stays in the viewport.
      </p>
    </>
  );
}
