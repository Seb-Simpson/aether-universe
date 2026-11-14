# Rendering and progressive detail — AETHER-002A

## Current limits

The bundled maps are colour/appearance maps, **not terrain or elevation**. Geometry density cannot recover image detail or turn the maps into measured terrain. No new surface map, displacement, landing mode or procedural crater detail is introduced in 002A.

| Body / asset | Actual local resolution | Previous sphere geometry | Constraint |
| --- | --- | --- | --- |
| Saturn | 2048×1024 | 96×64 segments / 12,096 triangles | Cloud appearance; no solid landing surface |
| Rings | 2048×125 RGBA radial strip | 256 angular segments / 512 triangles | Artistic particle distribution map, not individual particles |
| Titan | 720×360 | 48×32 / 2,976 triangles | Haze appearance, not the obscured solid surface |
| Enceladus | 1440×720 | 48×32 / 2,976 triangles | Historical map with coverage and resolution limits |
| Rhea | 1440×720 | 48×32 / 2,976 triangles | Historical map with coverage and resolution limits |

Provenance and licences are unchanged; see [ASSETS.md](ASSETS.md). All are local assets below `/aether-universe/`. No extra texture is downloaded or allocated. Saturn's oblateness, ring transparency/shadow, existing lighting and three moons are retained. Scene units, positions and dimensions remain illustrative rather than physical orbital coordinates.

## Implemented bounded geometry detail

`src/lib/detail-policy.ts` separates surface detail and projected-size policy from scene composition and camera mechanics. `src/components/scene-detail/sphere-lod.tsx` owns a three-geometry pool for the canvas session. All four bodies share unit spheres and scale their meshes to the existing scene radii; Saturn additionally retains its oblate vertical scale.

| Tier | Segments | Triangles | Vertices | Typed-array bytes, including indices |
| --- | --- | --- | --- | --- |
| Low | 24×16 | 720 | 425 | 17,920 |
| Medium | 48×32 | 2,976 | 1,617 | 69,600 |
| High | 96×64 | 12,096 | 6,305 | 274,336 |

These counts were measured from actual Three.js `SphereGeometry` buffers. Unit tests check the triangle budgets. The pool's combined raw attribute/index storage is 361,856 bytes versus 483,136 for the former separate Saturn-plus-three-moon geometries, about 25% lower before renderer bookkeeping. The number is not a whole-application heap or GPU-memory measurement.

A small distant moon uses 720 triangles instead of 2,976 (about 76% fewer). If Saturn is high and all three distant moons low, the body total is 14,256 versus the previous fixed 21,024 (about 32% lower). Actual draw statistics depend on frustum visibility, shadow passes and the active view. A close moon can use the high tier, deliberately spending more geometry where its silhouette benefits. The ring and stars keep their existing geometry.

Tier selection uses projected **CSS** diameter with hysteresis: low promotes above 60 px; medium demotes below 44 px or promotes above 180 px; high demotes below 140 px. This avoids repeatedly switching at one threshold while zooming. There is no per-frame React state or geometry/material allocation. Three shared geometries are allocated once; their GPU buffers upload on first use. Renderer geometry counts can therefore warm up by one tier, then remain bounded at three sphere buffers plus ring and stars (five geometries). The provider disposes its geometry pool on teardown. Cached source maps remain bounded to the existing assets, and R3F owns declared material disposal. QA should compare repeated cycles **after** first-use warm-up, not mistake lazy GPU uploads for a leak.

## Camera detail budget

A sphere's projected diameter is derived from radius, camera distance, vertical FOV and viewport height. The camera can use `textureLimitedDistance` to keep the central projected surface within a map budget of approximately:

`map width / (π × effective DPR)` CSS pixels, with effective DPR clamped to 1–1.25.

The DPR cap is an explicit perceptual compromise: a high-density phone does not make the selected body arbitrarily small, while the actual canvas retains its independent DPR cap. This is a bound on magnification, not a promise of one-to-one scientific detail at every latitude or angle. Equirectangular maps stretch near poles, source coverage varies, and lighting/materials are artistic.

At DPR 1 the central diameter budgets are about 652 px for Saturn, 229 for Titan and 458 for each icy moon. These numbers describe the **image budget**, not physical sizes or world-unit distances. Collision clearance and texture-detail floors are separate policies; satisfying collision alone does not justify zooming farther into a blurry map. The existing maps cannot support metre-scale or unlimited approach.

## Practical 002B terrain architecture (design, not implemented)

A terrain implementation should add a body-local, metres-based reference frame and a distinct surface-navigation mode. It must not reinterpret the present artistic scene coordinates as kilometres. Orbital focus remains the entry point; a validated coverage region and data availability should gate the hand-off to a local camera, terrain-aware collision and a tighter near/far depth range. A local/floating origin prevents precision loss close to the ground.

Use a quadtree of cube-sphere patches for global coverage, or a deliberately bounded georeferenced patch for the first landing area. Each tile manifest should record source product, coordinate frame, longitude convention, vertical datum/reference radius, sample spacing, coverage/no-data mask, attribution and checksums. Height geometry and colour imagery are separate channels. Offline resampling must preserve the DEM datum and mark interpolated/no-data areas; a colour image must never become an invented height field.

Choose tiles by projected geometric error, with hysteresis and parent tiles kept resident until all child resources are ready. Initial target: approximately 2 CSS pixels of geometric error, validated visually and with an actual-device frame budget. Shared patch grids plus per-tile height data replace allocating a new dense whole sphere. Reuse buffers; use abortable fetches and a bounded request queue; retain parent fallback on failures. On camera movement, discard stale completions by generation id and use an LRU resident cache with explicit disposal. A proposed initial tile GPU cap is 64 MiB, to be adjusted from measured devices rather than presented as an achieved budget. Mobile should receive fewer/smaller tiles, not an unbounded preload.

The same source-derived height sampler must drive both rendered displacement and collision. Camera/terrain clearance must include an uncertainty margin and avoid selecting unavailable finer detail. Cross a surface/orbit boundary only through an explicit transition with cancellation/recovery; never silently allow an orbital camera through the mesh while data streams.

## Best candidate for AETHER-002B

**Earth's Moon, initially one bounded region**, is the strongest terrain candidate. It has an actual solid surface and mature public DEM products with geodetic metadata. This is a future destination recommendation, not an extra destination implemented in 002A.

- [NASA PDS Geosciences: LRO/LOLA archive](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) provides the altimetry archive and product documentation.
- [NASA Goddard PGDA: SLDEM2015](https://pgda.gsfc.nasa.gov/products/54) documents a merged LOLA/SELENE terrain-camera DEM. The product covers ±60° latitude at 512 pixels/degree, with effective horizontal resolution described as roughly 60–100 m. It is **not** a metre-detail global terrain product; polar work should use the appropriate LOLA products instead.

Both source pages returned HTTP 200 and the SLDEM product description was inspected on 14 November 2026. No DEM files were downloaded or bundled. Before selecting an area, 002B must verify the specific product's datum, licence/credit requirements, voids and alignment with chosen imagery, and derive a justified closest-approach limit. Start away from polar coverage transitions and documented lower-quality regions; verify data in the chosen patch before promising an experience.

Within the current Saturn roster, Enceladus is a better research candidate than Titan, because the present Titan map depicts haze. However, the bundled Enceladus map is only colour and cannot justify terrain reconstruction. Saturn has no solid surface. A Saturn-moon-only 002B would first require a specific verified Cassini shape/DEM product and honest coverage limits, not generated terrain made to resemble its colour map.

## Verification limits

Triangle/index counts and mathematical detail-limit tests are deterministic. Browser QA records the actual overview draw statistics, tier changes, stable warmed allocations, teardown and paused rendering separately. Software WebGL timings do not measure phone GPU performance. No Safari/Firefox certification, thermal/battery benchmark, scientific terrain validation or landing-system test is claimed in 002A.
