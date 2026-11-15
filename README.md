# AETHER · Interactive observatory

A full-viewport astronomy explorer with Saturn, three Saturnian moons and Earth's Moon. Orbit a world, then approach Aristarchus crater to fly over real lunar terrain. Facts, controls and credits stay in optional panels; normal exploration requires no page scrolling.

## Run

Node **22.12+** required; Node **24** recommended. No account, API key, paid service or environment configuration is needed.

```bash
npm ci
npm run dev
# Open http://localhost:3000/aether-universe/
```

To test the production static export used by GitHub Pages:

```bash
npm run build
npm run start
# Open http://localhost:3000/aether-universe/
```

The server serves `out/` beneath the actual repository mount, without a Next.js runtime. Scripts, fonts, globe textures, elevation grids and terrain tiles are bundled locally. External scientific references load only when opened. The `/aether-universe/` part of the URL is required.

## Explore

- Select **Saturn, Titan, Enceladus, Rhea or Moon** in the dock, or press **1–5** outside dialogs. Visible Saturn-system meshes can also be selected directly.
- Drag with a mouse or one finger to orbit. Scroll or pinch to zoom; **Zoom in / Zoom out** provide accessible alternatives. Focus the viewport with Tab and use **arrow keys** to orbit.
- **Reset camera** restores a framed view of the current destination. **View** offers overhead and oblique views; the Saturn system also supports optional slow rotation. Reduced-motion settings remove camera easing and disable automatic rotation.
- On **Moon**, choose **Approach region**, then **Explore surface**. This opens the bounded **60 × 60 km Aristarchus region, 23.7° N, 47.5° W**.
- In surface mode, drag to look; hold **W/A/S/D** or **arrow keys** to fly horizontally, **E** to ascend and **Q** to descend. The six on-screen flight buttons support held mouse, touch and keyboard input. Scroll/pinch or use zoom buttons to approach/rise; approaching also brings the camera inward over the crater. Terrain collision maintains clearance above the measured surface and its coarse fallback meshes.
- **Return to orbit** leaves the surface. Selecting another destination also exits surface mode. Flight remains inside the measured region; context outside it is a textured reference sphere.
- **Object info** opens verified facts and sources. **Escape** closes panels and menus. Panels scroll internally while the scene remains in the viewport.
- WebGL 2 is required for 3D. Reading mode preserves object selection and references when unavailable; **Retry 3D** rebuilds the scene after a recoverable failure.

## Real terrain and scientific limits

Aristarchus uses genuine **SLDEM2015** elevations from LRO/LOLA and SELENE Terrain Camera, combined with an independently sourced **LROC WAC 100 m morphology mosaic**. The mesh has measured geometric relief, normals, lunar curvature and vertical exaggeration **1**. Elevation never comes from a colour image.

Approaching progressively loads nested height and imagery tiles. Five geometric levels sample the canonical regional grid at **937.5, 468.75, 234.375, 117.1875 and 58.59375 m** spacing. Parent meshes remain visible while children load; geomorphing and skirts control transitions and seams. The renderer adds real source samples rather than magnifying one fixed mesh. Bounded caches, stale-request cancellation and explicit disposal control runtime allocations.

The DEM's effective source resolution is about **60–100 m**; the imagery is about **100 m**. A 58.6 m output grid does not imply equivalent photographic detail or metre-scale positional accuracy. Close views can expose smooth sampled slopes and source-image shadows. No boulders, procedural geology, global high-resolution terrain, walking mode or fabricated detail is supplied. The source mosaic includes acquisition lighting, so dynamic illumination is a visual aid rather than calibrated photometry.

The lunar globe is spherical and the surface uses local metre coordinates. The wider Saturn composition remains **illustrative**, with exaggerated moon sizes and spacing, fixed positions and artistic lighting. It is not an ephemeris or a physically scaled Solar System. The Saturn moons' finite colour maps are unchanged and do not provide landing terrain.

See the [lunar renderer architecture](docs/LUNAR-ARCHITECTURE.md), [lunar data, coordinates, datum, checksums and attribution](docs/LUNAR-DATA.md), [bundled asset licences](docs/ASSETS.md), and the [002B verification record](docs/QA-002B.md). Historical [002A audit](docs/AUDIT-002A.md) and [rendering design](docs/RENDERING-002A.md) describe the immersive foundation incorporated here.

## Architecture

| Location                                                   | Responsibility                                                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/components/explorer.tsx`                              | Selection, full-viewport HUD, orbit/surface mode, camera commands and recovery          |
| `src/components/hud/`                                      | Compact destination dock, held flight controls, optional facts, help and credits        |
| `src/components/scene/SceneCanvas.tsx`                     | Lazy R3F canvas, Saturn-system rendering, Moon adapters and WebGL fallback              |
| `src/components/scene/CameraRig.tsx`                       | Saturn-system orbit adapter, focus transfers and clipping                               |
| `src/components/lunar/MoonOrbitScene.tsx`                  | Lunar globe, regional focus and orbital approach                                        |
| `src/components/lunar/LunarSurfaceScene.tsx`               | Local-frame flight, measured collision, tile streaming, shading and resource disposal   |
| `src/lib/lunar/`                                           | Data loading, grid sampling, quadtree detail selection, geometry and bounded tile cache |
| `public/lunar/`                                            | Deployable measured grids, nested tiles, imagery, PDS labels and provenance manifest    |
| `scripts/lunar/`                                           | Offline, reproducible source-data processing; no runtime Python dependency              |
| `src/lib/camera-policy.ts`                                 | Pure Saturn-system navigation constraints                                               |
| `src/lib/detail-policy.ts`, `src/components/scene-detail/` | Projected-size sphere detail policy and shared geometry lifecycle                       |
| `src/data/bodies.ts`                                       | Independently sourced facts, separate from rendering coordinates                        |
| `src/lib/explorer-state.ts`, `src/lib/scene-config.ts`     | Application transitions and illustrative Saturn-system composition                      |
| `src/lib/paths.ts`, `next.config.ts`                       | Static export and fixed `/aether-universe` base path                                    |
| `tests/e2e/`                                               | Browser tests against exported files, including surface flight and resource regressions |

Built with Next.js, strict TypeScript, React Three Fiber / Three.js, Drei and Tailwind CSS. This feature adds no JavaScript dependencies, state store, physics engine or backend.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Stop any listener on port 3000 first: Playwright starts its own static-export server. Tests use the real `/aether-universe/` path and cover existing destinations, lunar globe/approach, progressively finer terrain, collision, held flight controls, mouse/touch input, return to orbit, panels, keyboard/reduced motion, viewport layout, WebGL handling and prefixed asset requests.

Chromium's headless WebGL uses SwiftShader; mobile viewports and touch input are emulated. These checks do not establish physical-phone GPU, battery or thermal performance, or Safari/Firefox compatibility. Exact executed results and remaining limitations belong in [QA-002B.md](docs/QA-002B.md). Actual application captures are in `docs/screenshots/002b/`; failure traces and the HTML report are in ignored `test-results/` and `playwright-report/`.

For existing tablet/narrow-phone checks with the export already running, use `node scripts/responsive-smoke.mjs`. To check a published origin without starting a local server:

```bash
AETHER_TEST_URL=https://seb-simpson.github.io/aether-universe/ npm run test:pages
```

The feature branch is not automatically published. The live site may have an earlier release until this PR is reviewed, merged and successfully deployed.

## Data reproduction

The committed static derivatives are sufficient for normal installation, building and testing. Reprocessing is an optional **offline** workflow, requiring Python, NumPy, Pillow, requests and curl; it is not performed by the browser or CI. The scripts obtain bounded windows of public science products rather than downloading a global high-resolution DEM. Source URLs, byte ranges, PDS labels, grid conventions and checksums are documented in [LUNAR-DATA.md](docs/LUNAR-DATA.md). Recreate elevations first with `scripts/lunar/prepare_dem.py`, then aligned imagery with `scripts/lunar/prepare_imagery.py`.

## Assets and deployment

Saturn/rings and the Earth's Moon globe: **Solar System Scope, CC BY 4.0**. Saturnian moon maps: **NASA/JPL-Caltech via NASA 3D Resources**. Lunar terrain: **NASA/GSFC/MIT LOLA and JAXA/SELENE Terrain Camera teams**; regional imagery: **NASA/GSFC/Arizona State University LROC team**. Manrope: **SIL OFL**. Retain the full credits and links in [ASSETS.md](docs/ASSETS.md).

The GitHub Pages workflow publishes **only main**, using official Pages actions and job-scoped permissions. This task preserves `output: export`, `basePath` and trailing-slash behaviour, and does not merge or deploy the feature automatically. See [Pages settings](docs/PAGES.md). No APIs, authentication, databases, analytics or private credentials are required.
