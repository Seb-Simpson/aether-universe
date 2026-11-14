# AETHER · Saturn Explorer

A small observatory for a very big universe. A polished, responsive Saturn experience with a real WebGL scene, selectable moons, bounded camera controls, and NASA-sourced astronomy content.

## Run locally

Requires Node.js **22.12+** (Node 24 LTS recommended) and npm.

```bash
git clone https://github.com/Seb-Simpson/aether-universe.git
cd aether-universe
git checkout codex/aether-001b-pages
npm ci
npm run dev
```

Open **http://localhost:3000/aether-universe/**. No API keys, accounts, database, or environment variables are required. Textures and fonts are bundled locally; the experience makes no third-party runtime asset requests. Source links open external NASA and attribution pages only when clicked.

To run the production build:

```bash
npm run build
npm run start
```

## Explore

- Drag the scene to orbit; scroll or pinch to zoom. Zoom buttons provide a keyboard alternative.
- Select **Saturn, Titan, Enceladus, or Rhea** in the object strip. Direct selection of rendered bodies is also supported.
- **Explore [body]** opens sourced facts. **Escape** closes the panel.
- Camera controls offer oblique and overhead views, zoom, and reset to the selected body.
- Slow surface rotation is off by default. Reduced-motion preferences also turn off camera easing and disable optional rotation.
- **Field guide** provides context; **Sources & credits** documents representation and provenance.
- If WebGL is unavailable, a local illustrated fallback preserves every fact, selection control, and reference. Camera controls are disabled.

## Architecture

Built with Next.js App Router, strict TypeScript, React Three Fiber / Three.js, Drei orbit/texture helpers, and Tailwind CSS 4 with a custom CSS design system. No physics engine or postprocessing stack.

| Location | Responsibility |
| --- | --- |
| `src/app/` | Server-rendered shell, metadata, error boundary, local font, responsive styling |
| `src/components/explorer.tsx` | Accessible HTML interface, navigation, selection, panels, motion preferences |
| `src/components/scene/SceneCanvas.tsx` | Lazy-loaded WebGL scene, lights, rings, stars, body picking, camera rig and fallback |
| `src/data/bodies.ts` | Typed, referenced facts; no rendering coordinates |
| `src/lib/explorer-state.ts` | Pure state transitions and repeatable camera commands |
| `src/lib/scene-config.ts` | Explicitly illustrative scene coordinates and dimensions |
| `tests/e2e/` | Playwright production browser journeys |

See [architecture decisions](docs/ARCHITECTURE.md), [scientific sources](docs/SOURCES.md), and [asset licences](docs/ASSETS.md).

## Scientific scope

This is a curated encounter, **not a live view, ephemeris, or physically scaled solar-system simulation**. Moon sizes and spacing are exaggerated. Moon positions are fixed artistic placements. Optional rotation is not real time. Saturn is oblate and its ring texture shows major divisions, with directional lighting and a cast shadow; illumination and camera composition are artistic. No numerical facts are derived from scene units.

Titan's visible haze map is not a clear view of its surface. The Enceladus and Rhea maps contain observational coverage limits. The scene does not model atmosphere scattering, ring particle physics, mutual orbital motion, or mission-time Sun geometry.

Saturn/ring maps are by Solar System Scope, CC BY 4.0. Moon maps are NASA/JPL-Caltech through NASA 3D Resources. Font: Manrope, SIL OFL. Full attribution and original URLs are in [ASSETS.md](docs/ASSETS.md).

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright starts the static-export server on port 3000 at `/aether-universe/` (run `build` first). Stop any existing server on that port before running tests. Set `AETHER_TEST_URL` to test a public deployment instead. The suite covers selection, sourced panels, zoom/presets/reset, mouse orbit, keyboard activation, navigation, reduced motion, WebGL fallback, console errors, stable renderer allocations, and desktop/mobile layouts. Chromium uses SwiftShader in the test configuration so WebGL works in headless Linux. Screenshots are written to `docs/screenshots/`; failure traces/report go to ignored `test-results/` and `playwright-report/`.

For additional tablet (1024px) and narrow-phone (360px) checks, keep the production server running and run `node scripts/responsive-smoke.mjs` in another terminal. This verifies actual mouse/touch orbit, control reachability, paused image stability and repeated-selection allocations, and writes `docs/qa-metrics.json`.

Tests are intentionally behavioural; screenshots require human visual review. Current executed results and measurement limits are recorded in [QA.md](docs/QA.md).

## Performance & deployment

The application is statically exported for GitHub Pages at `/aether-universe/`. See [Pages setup and deployment](docs/PAGES.md). The page shell and field guide are statically generated. The Three.js runtime loads only on the client. The canvas renders on demand, uses capped DPR (1–1.75), one 1024² shadow map, modest sphere geometry, and no postprocessing. Optional motion invalidates frames only while the document is visible; when paused the scene settles to idle. Geometry and cached texture allocations remain stable across body selection. Component-owned geometry and event listeners are cleaned up on unmount; loader-cached shared maps live for the canvas session.

`npm run build` produces `out/`; `npm run start` serves those exported files locally. The Pages workflow deploys pushes to `main` under the user’s subsequent publishing authorization. WebGL 2 is required for 3D; HTML content works without it. Real-device GPU/thermal performance and Safari/Firefox are not certified by the included Chromium run. There is no analytics or persistent user data.

Future destinations should use the same data/scene/state boundaries. Only Saturn's system is available in this release; there are no simulated destination links or unfinished account features.
