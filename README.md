# AETHER · Interactive observatory

A viewport-based Saturn explorer. Open it, pick a world, and orbit. Scientific facts and credits are available when requested; normal exploration never requires page scrolling.

## Run

Node **22.12+** required; Node **24** recommended. No account, API key, paid service or environment configuration is needed.

```bash
npm ci
npm run dev
# http://localhost:3000/aether-universe/
```

For the production static export used by GitHub Pages:

```bash
npm run build
npm run start
# http://localhost:3000/aether-universe/
```

The static server serves `out/` at the actual repository mount; it is not a Next runtime server. All textures and fonts are bundled locally. Source references open external pages only when selected.

## Explore

- Drag with a mouse or one finger to orbit. Scroll or pinch to zoom; + / − are keyboard-accessible alternatives.
- Select Saturn, Titan, Enceladus or Rhea in the compact dock, directly on a visible mesh, or with keys **1–4** outside dialogs.
- Focus the 3D viewport with Tab and use **arrow keys** to orbit. **Reset camera** restores a framed view of the current object.
- **View** contains overhead/oblique perspectives and optional slow rotation. Rotation starts off; reduced-motion settings disable rotation and camera easing.
- **Object info** opens a contextual facts panel with NASA references. **Escape** closes panels, the view menu and native help/about dialogs. Text panels scroll internally; the canvas remains in the viewport.
- Zoom stops at an available-detail limit determined by map resolution and screen size, with conservative collision checks. There is no surface or landing mode.
- WebGL 2 is needed for the scene. If unavailable or lost, reading mode preserves object selection, facts and references while camera controls disable.

## Architecture

| Location | Responsibility |
| --- | --- |
| `src/components/explorer.tsx` | Client shell coordinating selection, HUD, motion preferences and camera commands |
| `src/components/hud/` | Compact object dock, optional sourced facts and help/credits content |
| `src/components/scene/SceneCanvas.tsx` | Lazy R3F canvas, lighting, rings, body picking, loading/error fallback |
| `src/components/scene/CameraRig.tsx` | Orbit adapter, focus transfers, scale-aware clipping, input and camera status |
| `src/lib/camera-policy.ts` | Pure navigation constraints and collision/transfer policy in scene units |
| `src/lib/detail-policy.ts`, `src/components/scene-detail/` | Bounded projected-size sphere LOD and shared resource lifecycle |
| `src/data/bodies.ts` | Independently sourced facts; no rendering coordinates |
| `src/lib/explorer-state.ts` | Pure selection and repeated camera-command state transitions |
| `src/lib/scene-config.ts` | Illustrative positions, radii and fitting helpers |
| `src/lib/paths.ts`, `next.config.ts` | Fixed `/aether-universe` path and static export |
| `tests/e2e/`, `scripts/responsive-smoke.mjs` | Real exported-app journeys, gesture/layout/resource regression checks |

Built with Next.js, strict TypeScript, React Three Fiber / Three.js, Drei controls/loaders and Tailwind CSS with a custom design system. No state-store, physics or postprocessing dependencies are added.

Read the [002A audit](docs/AUDIT-002A.md), [rendering and terrain roadmap](docs/RENDERING-002A.md), and [executed verification record](docs/QA-002A.md). Historical 001/001B records remain available in `docs/`.

## Detail, scale and 002B

This is a curated composition, **not an ephemeris or physically scaled simulation**. Moon sizes/spacing are exaggerated and their positions are fixed. Lighting, orientation and optional rotation are artistic. Saturn's oblate shape and major ring divisions are represented. No physical altitude or distance is inferred from scene coordinates.

Map resolutions are finite: Saturn 2048×1024, Titan 720×360, Enceladus/Rhea 1440×720. Titan shows its haze; there are no elevation maps, inferred bumps or fabricated terrain. Geometry LOD improves the cost of small distant bodies, not the information contained in a texture. Collision bounds are conservative geometric envelopes, not scientific surface models.

The proposed **AETHER-002B target is Earth's Moon**, supported by NASA LRO/LOLA and SLDEM elevation data. It is a future destination, not an available control. The current Saturn moons' colour maps cannot support credible landing terrain. Data provenance, coordinate frames, elevation datums, coverage and licences must be validated before implementing that next phase. See the rendering roadmap for the bounded tile/LOD/cache and navigation-adapter plan.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Stop any server using port 3000 first: Playwright starts its own static-export server. Chromium uses SwiftShader for headless WebGL; desktop and mobile layouts are emulated. Tests cover subject selection, camera modes/limits/transitions, pointer/touch controls, panels, keyboard/reduced motion, no document scrolling, WebGL failure, resource bounds and prefixed Pages asset requests.

With the production server already running, `node scripts/responsive-smoke.mjs` runs additional tablet/narrow-phone layout, idle-frame, mesh-picking and resource checks. `AETHER_TEST_URL=https://seb-simpson.github.io/aether-universe/ npm run test:pages` targets a public origin without starting a local server. The live main site remains the published 001B until this feature is approved and merged.

Before/after captures at matching viewports and current test results are in `docs/screenshots/002a/` and [QA-002A.md](docs/QA-002A.md). These are inspected evidence, not pixel baselines. Failure traces/report go to ignored `test-results/` and `playwright-report/`.

## Assets and deployment

Saturn/ring textures: Solar System Scope, CC BY 4.0. Moon maps: NASA/JPL-Caltech through NASA 3D Resources. Manrope: SIL OFL. See [asset provenance](docs/ASSETS.md) and [scientific sources](docs/SOURCES.md).

The existing GitHub Pages workflow publishes **only main**, with the official Pages actions and job-scoped permissions; this task does not deploy or merge the feature automatically. `output: export`, `basePath` and trailing-slash handling remain intact. See [Pages settings](docs/PAGES.md). There are no APIs, authentication, databases, analytics or persistent user data.

Demand rendering, capped DPR, one shadow map and a bounded shared sphere pool limit work. Paused scenes settle to idle. Component-owned geometry and listeners are disposed/removed; shared map caches remain bounded for the canvas session. Real-device GPU/thermal performance, Safari/Firefox, screen-reader certification and long-duration heap profiling require further validation; software-renderer timing is not a hardware FPS benchmark.
