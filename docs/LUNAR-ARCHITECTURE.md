# Lunar renderer and navigation

002B extends the merged 002A viewport shell. Saturn's existing scene, shared sphere LOD pool and orbital camera remain intact. Earth's Moon has a separate coordinate frame: it is not placed beside Saturn at an invented distance.

## Coordinates and navigation

`MoonOrbitScene` uses a spherical Moon of radius 2 scene units and the 1,737,400 m data reference radius for conversion. The documented Aristarchus normal and south vectors drive regional approach. The global map is replaced by a measured parent patch at approach; a shader window avoids a reference sphere covering below-datum crater relief.

Surface entry switches to a local east/up/south metre frame with its origin at the region's mean elevation. The entry pose and 40° field of view match the regional orbital approach. Analytic sphere sagitta accounts for curvature; it is not a terrain source. The same sun direction is transformed between frames. Reset returns to the initial regional aerial pose; Return to orbit restores the full Moon.

The surface camera supports drag to look, wheel/pinch to approach, WASD/arrows for horizontal flight and Q/E for height. DOM hold controls support touch and keyboard. Movement speed scales with clearance. A swept collision envelope samples the same measured height grid and every possible parent mesh between successive camera poses. It keeps at least 45 m of conservative clearance, including while a finer mesh is loading. This is clearance above the render/collision envelope, not a claim of survey-grade altitude. The camera is bounded 800 m inside the study edge.

## Progressive geometry and imagery

The 60 km region contains a 1025² canonical float32 height grid and a quadtree of 341 static 65² tiles, levels 0–4. Each level doubles spatial sampling: 937.5 → 468.75 → 234.375 → 117.1875 → 58.59375 m. Parent vertices are exact nested samples. Each tile's geometry comes from its own downloaded height payload; imagery is a separate, georeferenced channel. Refinement introduces additional measured elevations, not subdivided colour or synthetic noise.

Projected sample spacing selects detail using distance, viewport height, field of view and separate desktop/mobile pixel budgets. This is a practical spacing heuristic, not a certified bound on geometric error. All ancestors are requested before descendants. The renderer replaces a parent only when all four children are resident, and retains the parent on child failure. A 0.45 s height/normal geomorph softens child introduction; already cached children also morph on re-entry. Coarsening can still show a small transition at rapid zoom changes. Edge skirts seal mixed-level borders and are omitted from shadow depth. Shared DEM-apron normals prevent skirt faces from tilting top-surface lighting at tile edges.

Texture parents are downsampled from the same LROC crop. Refinement exposes more image information up to the source's 100 m resolution. The finest 58.6 m grid does not imply 58.6 m imagery or metre-scale terrain accuracy. Image contrast and acquisition shadows limit photometric realism.

## Streaming, budgets and ownership

`TerrainTileCache` deduplicates requests, limits concurrency to three, aborts obsolete generations, disposes late completions, and evicts least-recently-used entries. Root fallback is pinned. Tile budgets are 32 MiB / 100 entries on mobile and 64 MiB / 180 entries on desktop. Accounted bytes include geometry/index/attribute buffers and decoded RGBA image bytes; driver overhead and mipmaps are additional. These are tile-cache limits, not whole-browser memory claims.

The 4.2 MB canonical regional grid loads once per surface session for collision and parent morph sampling. A complete high-resolution global DEM never downloads. Globe appearance uses 8k desktop / 4k mobile maps; local horizon context uses a 2k map. A destination owner retains the globe texture through orbital/surface transitions, avoiding repeated decode/upload stalls; leaving the Moon releases it. The decoded globe costs approximately 128 MiB desktop / 32 MiB mobile before mipmaps and is outside the tile-cache budget. All are local static assets under the Pages base path.

A tile owns geometry, visible/depth materials, its texture and ImageBitmap. Eviction and scene unmount explicitly dispose/close them. Camera input listeners, queued fetches, background geometry, textures and directional shadow targets have matching cleanup. Repeated entry/return allocation checks and cache unit tests verify the lifecycle. Demand rendering stops when camera, loading and morphing settle.

## Boundaries and recovery

Outside the region, a textured reference sphere supplies curvature and a horizon, without invented elevations. The finite study boundary can be apparent from high or peripheral views; it is a disclosed data boundary, not a global terrain system. Missing or invalid tile data never become zero-filled terrain: parent detail remains, with a visible status. Failure of the canonical grid offers Return to orbit. WebGL context loss unmounts the scene into reading mode; Retry 3D creates a fresh renderer and permits re-entry.

Scientific provenance and preprocessing are in [LUNAR-DATA.md](LUNAR-DATA.md). Actual browser results, allocation measurements and screenshots are in [QA-002B.md](QA-002B.md).
