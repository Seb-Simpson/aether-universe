# Verification record

Verified against a locally built production application, served with `npm run start` on 14 November 2026. This record distinguishes executed checks from limitations.

## Automated checks

| Check                                                        | Result                                                                                             |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| ESLint                                                       | Pass; no errors or warnings                                                                        |
| TypeScript (`tsc --noEmit`)                                  | Pass                                                                                               |
| Vitest                                                       | 10 tests pass: reducer behavior, sourced-data integrity, bundled assets, responsive camera fitting |
| Next.js production build                                     | Pass; statically prerendered application route                                                     |
| Playwright / complete desktop and mobile suite               | 10/10 pass (4.6 minutes; included high-DPR mobile)                                                 |
| Playwright / affected mobile journeys after card auto-reveal | 5/5 pass (1.1 minutes)                                                                             |
| Playwright / camera journeys after drag-selection correction | 2/2 pass (1.2 minutes)                                                                             |
| Responsive/picking/idle/resource smoke                       | Pass; tablet and narrow mobile plus direct 3D moon selection                                       |

The Playwright suite runs five journeys at desktop 1440 × 1000 and emulated mobile 412 × 915 dimensions in Chromium. The complete passing run used the Pixel 7 profile’s DPR 2.625 (the scene caps rendering at 1.75). Subsequent affected mobile reruns and the checked-in CI configuration use DPR 1 to keep SwiftShader practical; CSS dimensions and touch emulation remain mobile. It verifies:

- Real WebGL scene readiness, subject selection, linked NASA facts, information-panel closure and stable renderer resource counts.
- Camera zoom, numeric polar-angle changes for two presets, moon focus after an earlier camera command, drag orbit, reset and optional rotation.
- Reduced-motion support, keyboard activation, help dialogs, destination navigation and the field-guide anchor.
- Useful reading mode when WebGL is unavailable at startup.
- Recovery to reading mode following an actual `WEBGL_lose_context` event; camera controls disable while facts remain available.

Console errors and uncaught page errors are collected during the scene and camera journeys. Screenshots are evidence for visual inspection rather than pixel baselines. Production code exposes a small set of renderer/camera telemetry attributes to support deterministic interaction assertions.

## Visual evidence

`docs/screenshots` contains desktop/mobile initial viewports, complete pages, sourced information, ring views from above and at an oblique angle, and WebGL fallback. Tablet and narrow-phone viewport captures accompany `docs/qa-metrics.json`.

Initial visual QA found clipped rings in the top preset and narrow-screen initial framing. The camera-fit implementation was corrected, and replacement screenshots are captured against the final production build. An earlier mobile camera journey exceeded its original 45-second test budget under software WebGL; the journey now allows 90 seconds and uses fewer drag samples. The full rerun passed. A subsequent pointer regression exposed a second issue: dragging across a body also selected it on release, resetting the view. Mesh picking now ignores drag travel. The final camera journeys and supplementary pointer-release regression both pass. Selecting a mobile object card also reveals the chosen world by scrolling back to the explorer.

## Performance and scope

Chromium uses SwiftShader software WebGL in this Linux environment. Rendering/capture durations here are not representative of hardware-accelerated desktops or phones. Device pixel ratio is capped, optional rotation starts off, and demand rendering avoids an always-running animation loop when the scene is idle. No postprocessing or physics engine is shipped.

The supplementary browser record checks 1024 × 768 tablet and 360 × 800 phone layouts. Both have zero horizontal overflow, all seven camera/help controls are reachable, and idle canvas frames one second apart are byte-identical. Pointer orbit changes the polar angle from 1.259 to 0.891 radians and retains 0.891 after release; touch orbit changes it to approximately 0.760 radians. Direct clicks on the actual Titan, Enceladus, and Rhea meshes select the correct world.

Renderer telemetry reports **6 geometries and 8 textures**, unchanged after eight complete subject changes. The tablet overview reports **7 main-pass draw calls and 22,048 triangles**; shadows add work beyond these main-pass counters. There were no console errors or uncaught page errors in the observed scene/camera/supplementary journeys. These bounded allocation and idle-frame checks found no obvious retained Three.js resource growth or unintended visible animation.

Reproduce the supplementary checks with an already running production server:

```bash
# Terminal 1
npm run build
npm run start

# Terminal 2
node scripts/responsive-smoke.mjs
```

The script asserts its findings, writes `docs/qa-metrics.json`, and refreshes tablet/narrow-phone screenshots. The `readyMs` field is elapsed time until scene-ready plus camera settling, including a 250 ms harness delay; it is neither network load time nor a time-to-interactive measurement. `npm run test:e2e` starts its own production server when needed.

No hardware-device GPU benchmarks, Safari/Firefox runs, screen-reader audit, sustained battery measurements, or long-duration leak profiler were executed. Resource-count stability checks identify obvious retained Three.js allocations; they are not a comprehensive heap-leak analysis.

## Known defects and unfinished scope

No known functional defects remain in the executed journeys. No requested foundation requirement is knowingly unfinished. Future destinations remain future work; they are not presented as usable destinations. The rendering is an artistic composition, with fixed moon positions and exaggerated size/distance relationships, as disclosed in the application and README.
