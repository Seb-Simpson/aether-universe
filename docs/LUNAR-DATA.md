# AETHER-002B data record — Aristarchus

## Study area and baseline

Built on merged 002A, main `d6901fa9ce6a2d4404a0e1df793c735b631cebfd`. PRs #1/#2 remain unrelated and unmerged; a dedicated `codex/aether-002b-lunar-terrain` branch holds this implementation. Pages remains a static export at `/aether-universe/`; no publishing trigger or main content is changed.

Aristarchus region: **23.7° N, 312.5° E (47.5° W)**, **60 km × 60 km**, local east/south axes. Bounds: north 24.6893366°, south 22.7106634°, west 311.4195402°, east 313.5804598°. This region includes the crater, rim, floor and central relief; it was chosen for genuine coverage, not generated topography.

## Elevation source

- [NASA Goddard SLDEM2015 description](https://pgda.gsfc.nasa.gov/products/54)
- [NASA PDS LRO/LOLA archive](https://pds-geosciences.wustl.edu/missions/lro/lola.htm)
- Product: `SLDEM2015_512_00N_30N_270_315_FLOAT`, [source IMG](https://imbrium.mit.edu/DATA/SLDEM2015/TILES/FLOAT_IMG/SLDEM2015_512_00N_30N_270_315_FLOAT.IMG) and [PDS label](https://imbrium.mit.edu/DATA/SLDEM2015/TILES/FLOAT_IMG/SLDEM2015_512_00N_30N_270_315_FLOAT.LBL).
- Credit: NASA/GSFC/MIT LOLA team and JAXA/SELENE Terrain Camera team. Citation: Barker et al., 2016, _Icarus_ 273, 346–355, doi:10.1016/j.icarus.2015.07.039.
- Frame: Mean Earth / Polar Axis of DE421; planetocentric latitude, east-positive longitude. Simple cylindrical projection, 512 pixels/degree, pixel-registered. PC_REAL little-endian float32, source units **kilometres**, scaling 1. Heights are relative to the **1737.4 km reference sphere**, not an Earth geoid.
- The geographic grid spacing is about 59.2 m north/south and 54.2 m east/west here. Effective source resolution is roughly 60–100 m; sampling is not a claim of that accuracy in every direction.
- Downloaded only bytes 250490880–344033279 (93,542,400 bytes), not the entire 1.4 GB source tile. Exact source-range SHA256 and derivative SHA256 are in `public/lunar/manifest.json`.

The offline processor converts source kilometres to metres, bilinearly resamples the bounded region to a 1025×1025 grid (58.59375 m local spacing), and writes nested 65×65 float32 tiles at levels 0–4. Levels have spacing 937.5, 468.75, 234.375, 117.1875 and 58.59375 m. Parent vertices are an exact subset of child source samples. A unit test validates **every sample of all 341 tiles** against the canonical grid, including shared borders.

All cropped samples are valid: no missing values were filled. The observed elevation range is **−3309.511 m to +519.230 m**, relief 3828.741 m; centre height −3003.72 m. The canonical grid SHA256 is `bd68852f9523d50817eda7928d237d60d34fef26c5c0d90a92b5d26ed940bda0`. Regional render/collision coordinates remove the mean height −1072.510 m and analytic lunar curvature. Vertical exaggeration is **1**. Heights never come from imagery.

## Regional imagery

- Product: **WAC_GLOBAL_E300N3150_100M**, v1.3, NASA/GSFC/Arizona State University LROC team.
- [Official product and method](https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLOBAL/) and [source IMG](https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/DATA/BDR/WAC_GLOBAL/WAC_GLOBAL_E300N3150_100M.IMG).
- Embedded PDS label is bundled as `source-imagery.lbl`: planetocentric/east-positive equirectangular projection, reference radius 1737.4 km, map scale 100 m/pixel,303.23350424149 pixels/degree. Projection offsets define pixel centres, with line 18193.5 and sample −81873.5. This is a 643 nm monochrome morphological mosaic, not a colour-derived height field.
- Downloaded a bounded 66,153,384-byte row window via HTTP Range. Source-range checksum is in the manifest. The same latitude/longitude bounds as the DEM select the texture. Native east spacing is about 91.6 m here and north spacing 100 m.
- Display conversion applies one documented percentile contrast stretch to float radiance and JPEG encoding. The 1025 px regional image is oversampled relative to the 100 m imagery; it does **not** imply 58.6 m photographic detail. Tile imagery is progressively sampled up to the available source information, without synthetic noise or invented detail.
- Source images include acquisition illumination/shadows, so dynamic shading is a visual aid, not calibrated photometry. The regional image and heights are registered by their PDS coordinates; this is not a claim of subpixel bundle-adjusted alignment across products.

## Globe appearance

The preferred NASA SVS Moon-kit downloads returned 503 in the execution environment; an independent source was used for globe colour only. `moon.jpg` is derived from the [Solar System Scope 8192×4096 Moon map](https://www.solarsystemscope.com/textures/download/8k_moon.jpg), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit Solar System Scope; JPEG re-encoded and 4k/2k derivatives generated. Globe longitude convention was verified against the regional WAC image: the −47.5° crop has the same recognizable crater/peak layout (64 px comparison correlation 0.929; this is a visual-alignment check, not a geodetic accuracy claim). The globe is a true sphere; other destinations retain their previously disclosed artistic scales.

## Usage, reproduction and limits

NASA/PDS science data are publicly distributed; retain instrument-team credits and Barker/Speyerer references. See [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) and the linked PDS archive labels. No logos or endorsement are used. No paid data service or key is required; all runtime assets are local.

Offline tools require Python with NumPy, Pillow and requests (not JavaScript/runtime dependencies). `scripts/lunar/prepare_dem.py` documents and reproduces the bounded elevation download; run `scripts/lunar/prepare_imagery.py` afterwards for WAC imagery/tiles. `scripts/lunar/prepare_globe.py` reproduces the licensed globe derivatives and tiny dock thumbnail from a checksum-verified source. Source inputs are not fetched by the browser or CI. Metadata/checksums accompany the deployable derivatives.

Outside the study area the renderer uses a textured reference-sphere context, **not measured terrain**. The flight area is bounded inside the dataset. Edge skirts seal LOD seams but are excluded from terrain shadow casting; they are rendering machinery, not geology. Surface collision uses measured heights plus the resident/coarse mesh envelope. Source resolution/coverage cannot justify metre-scale surface accuracy, boulders, walking or unlimited global terrain. No such detail is generated.

## Objective detail check

`PYTHONPATH=<offline-python-environment> python scripts/lunar/measure_detail.py` compares each nested triangular mesh with the same measured fine-grid locations. Level 0 omits up to **294.286 m** of relief (25.417 m RMS) present in the fine grid; level 1 has 11.620 m RMS difference, level 2 5.184 m and level 3 2.171 m. Level 4 contains all canonical samples. These are LOD approximation differences, **not** claims about the accuracy of the source observations. See `docs/screenshots/002b/data-detail.json`; runtime selected mesh sample counts are recorded separately by the browser and include duplicated tile-edge vertices and tiles outside the camera frustum.
