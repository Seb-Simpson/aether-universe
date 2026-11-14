# AETHER foundation

## Boundaries

- `src/app`: Next.js App Router, static metadata and global design system.
- `src/components/explorer.tsx`: client shell coordinating destination, scene commands, motion preferences and panels. No per-frame state enters React.
- `src/components/scene`: lazy-loaded React Three Fiber canvas, disposable geometry/materials, bounded orbit controls and camera rig. A command + nonce interface allows repeated camera actions without exposing renderer internals.
- `src/data/bodies.ts`: typed, sourced astronomical content, independent of renderer and UI.
- `src/lib`: pure state transitions and reusable browser hooks.
- `tests/e2e`: Playwright tests against a production server; screenshots are evidence, not pixel snapshots.

## Product constraints

Only Saturn is an available destination. Its three featured moons are selectable. Future destinations must remain explicitly unavailable until implemented; this release shows only a note about future destinations. Scene composition is illustrative: moon radii and spacing are exaggerated, positions are not ephemerides, and rotation is not real time. Source values remain independent from scene units.

## Rendering policy

Bundle local assets, cap device pixel ratio, avoid postprocessing and physics dependencies, stop optional motion for reduced-motion preferences, and provide useful HTML content when WebGL is unavailable. Camera changes must remain bounded and resettable. Keep explanatory controls in HTML for keyboard and assistive-technology access.
