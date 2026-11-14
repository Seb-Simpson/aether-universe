# AETHER-002A audit and implementation boundary

Base: latest main `93503a12149e23a990336a54e4a68175a11fde4b`, inspected before implementation. Feature branch: `codex/aether-002a-immersive`.

## Repository and publishing

PR #1 (foundation) and PR #2 (Pages review) remain open/unmerged. Main contains the published application as a separate commit. PR #2 has later documentation and browser-fetch test fixes absent from main; this task starts from main and carries the relevant proxy-safe test correction independently. Next uses static export, fixed `/aether-universe` basePath and trailing slashes. The Pages workflow publishes only main, so a feature branch and PR can be tested without replacing the live site. No workflow deploy trigger or repository setting is changed by this task.

## Measured experience before changes

Matching anonymous live-browser captures at 1440×1000, 412×915 and 360×800 are in `docs/screenshots/002a/`. Desktop document height was 1864px with a 1065×650 canvas (48.1% viewport area). Mobile document height was 2804px with a 412×430 canvas (47.0%). Narrow phone height was 2819px. The hero, footer and educational cards require scrolling to discover/select bodies. Information is expanded by default across the page.

## Technical constraints

- R3F on-demand rendering, capped DPR, one directional shadow map and five local maps already work. Preserve this foundation and source/licence references.
- Saturn: 2048×1024 albedo, 2048×125 radial ring strip; Titan: 720×360 hazy map; Enceladus/Rhea: 1440×720 maps. These are colour maps, not terrain elevation.
- Fixed Saturn96×64 and moon48×32 sphere tessellation spends vertices on tiny background moons. Increasing subdivision does not add texture detail.
- Current camera only enforces selected-body min/max distances after a tween. Straight eye/target interpolation can cross other bodies; near plane is fixed despite very different subject radii. Camera/state/rendering boundaries exist but camera logic occupies the scene root.
- Existing browser tests encode the old scrolling layout and old camera distances. Preserve their functional coverage while replacing obsolete assertions and adding viewport/collision/detail/gesture regressions.

## Direction established before implementation

A quiet observatory HUD: graphite-black viewport, warm ivory text and muted brass focus accents. Full available scene, a small selected-object label and four-object dock; camera actions at an edge. Facts and sources open contextually. Help/credits live behind native dialogs. No landing copy, decorative statistics or permanent article cards. Touch targets and safe-area insets are first-class; scroll is confined to optional text panels.

Extract an orbit-only camera adapter with pure navigation constraints, swept collision checks and safe transfer paths. Zoom is limited by the actual map detail and conservative collisions. Expose a future surface-adapter boundary, without implementing or advertising surface travel. Use a bounded shared sphere LOD pool only if triangle counts show a benefit; no dynamic texture duplication or speculative terrain.
