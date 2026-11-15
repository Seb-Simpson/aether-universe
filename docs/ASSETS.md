# Bundled asset provenance and licences

All runtime textures are served locally. No paid API, image host, external font, or account is required to run the application. Original Saturn-system assets retrieved **14 November 2026**; lunar assets added for AETHER-002B.

## Saturn

**Credit: Solar System Scope, https://www.solarsystemscope.com/textures/**

| Local asset                       | Original download                                                                                     | Resolution      | Licence                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| `public/textures/saturn.jpg`      | [2K Saturn texture](https://www.solarsystemscope.com/textures/download/2k_saturn.jpg)                 | 2048 × 1024     | [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) |
| `public/textures/saturn-ring.png` | [2K Saturn ring texture](https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png) | 2048 × 125 RGBA | [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) |

The [provider's texture page](https://www.solarsystemscope.com/textures/) explicitly permits use, adaptation and redistribution, including commercial use, under CC BY 4.0. Downloads are bundled without pixel modifications; runtime UV mapping, lighting, materials and tone mapping affect their appearance. Retain attribution and licence links when redistributing or adapting them. These maps are visualization assets, not raw scientific measurements.

## Saturnian moons

**Credit: NASA / NASA 3D Resources.**

Downloaded unchanged from the official [NASA-3D-Resources repository](https://github.com/nasa/NASA-3D-Resources), pinned at commit `11ebb4ee043715aefbba6aeec8a61746fad67fa7`.

| Local asset                     | Original repository path                                                                                                                                                                    | Resolution |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `public/textures/titan.jpg`     | [Saturn - Titan.jpg](https://github.com/nasa/NASA-3D-Resources/blob/11ebb4ee043715aefbba6aeec8a61746fad67fa7/Images%20and%20Textures/Saturn%20-%20Titan/Saturn%20-%20Titan.jpg)             | 720 × 360  |
| `public/textures/enceladus.jpg` | [Saturn - Enceladus.jpg](https://github.com/nasa/NASA-3D-Resources/blob/11ebb4ee043715aefbba6aeec8a61746fad67fa7/Images%20and%20Textures/Saturn%20-%20Enceladus/Saturn%20-%20Enceladus.jpg) | 1440 × 720 |
| `public/textures/rhea.jpg`      | [Saturn - Rhea.jpg](https://github.com/nasa/NASA-3D-Resources/blob/11ebb4ee043715aefbba6aeec8a61746fad67fa7/Images%20and%20Textures/Saturn%20-%20Rhea/Saturn%20-%20Rhea.jpg)                | 1440 × 720 |

NASA's repository [README](https://github.com/nasa/NASA-3D-Resources/blob/11ebb4ee043715aefbba6aeec8a61746fad67fa7/README.md) describes these assets as “free and without copyright” and points to [NASA's images and media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). NASA material generally is not subject to copyright in the United States; NASA insignia and endorsement rights are separate. This product does not use NASA logos or imply NASA endorsement.

The moon maps are historical visualization maps, with finite resolution and coverage limitations. Titan's map represents its hazy appearance, not a detailed visible-light map of its obscured surface. Colour, illumination and apparent scale in this application are illustrative.

## Earth’s Moon: globe and measured Aristarchus terrain

**Globe credit: Solar System Scope, CC BY 4.0.**

| Local asset                   | Source                                                                        | Resolution / treatment                           |
| ----------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| `public/lunar/moon.jpg`       | [8K Moon map](https://www.solarsystemscope.com/textures/download/8k_moon.jpg) | 8192 × 4096, JPEG re-encoded                     |
| `public/lunar/moon-4k.jpg`    | Same source                                                                   | Downsampled 4096 × 2048 mobile globe             |
| `public/lunar/moon-2k.jpg`    | Same source                                                                   | Downsampled 2048 × 1024 reference-sphere context |
| `public/lunar/moon-thumb.jpg` | Same source                                                                   | Downsampled 128 × 64 dock thumbnail              |

These derivatives retain the source map's meaning and are distributed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). Runtime lighting and tone mapping alter display appearance. The globe texture is a visualization map; it is **not** an elevation source. The preferred NASA SVS downloads could not be retrieved in the execution environment, so this documented independent source was used for globe appearance.

**Elevation credit: NASA/GSFC/MIT LOLA team and JAXA/SELENE Terrain Camera team.**

`public/lunar/heights.bin` and `tiles/{level}/{x}/{y}.bin` are cropped, resampled derivatives of **SLDEM2015_512_00N_30N_270_315_FLOAT**. Source: [NASA Goddard product description](https://pgda.gsfc.nasa.gov/products/54), [PDS LRO/LOLA archive](https://pds-geosciences.wustl.edu/missions/lro/lola.htm), and the [MIT source IMG](https://imbrium.mit.edu/DATA/SLDEM2015/TILES/FLOAT_IMG/SLDEM2015_512_00N_30N_270_315_FLOAT.IMG). Citation: Barker et al. (2016), _Icarus_ 273, 346–355, [doi:10.1016/j.icarus.2015.07.039](https://doi.org/10.1016/j.icarus.2015.07.039).

The bounded 60 × 60 km region is centred on **23.7° N, 312.5° E (47.5° W)**. Measured elevations are converted from source kilometres to metres relative to the 1737.4 km sphere; the local display removes a reference height and lunar curvature with vertical exaggeration 1. Effective elevation resolution is roughly 60–100 m. No elevation is inferred from photographic colour or generated noise. The original PDS label is bundled as `public/lunar/source-dem.lbl`.

**Regional imagery credit: NASA/GSFC/Arizona State University LROC team.**

`public/lunar/region.jpg` and `tiles/{level}/{x}/{y}.jpg` are aligned derivatives of **WAC_GLOBAL_E300N3150_100M v1.3**, from the [official WAC morphology mosaic](https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLOBAL/) and [PDS source IMG](https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/DATA/BDR/WAC_GLOBAL/WAC_GLOBAL_E300N3150_100M.IMG). A fixed percentile contrast stretch and JPEG encoding make the source float imagery displayable. The image is a 643 nm morphological mosaic at approximately 100 m source resolution and contains acquisition illumination and shadows; it is not calibrated albedo or fabricated detail. The original embedded PDS label is bundled as `public/lunar/source-imagery.lbl`.

NASA/PDS science products are publicly distributed. Retain the instrument-team credits, source references and scientific citation when redistributing derivatives. Follow [NASA's images and media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/); no NASA insignia or endorsement is implied. See [LUNAR-DATA.md](LUNAR-DATA.md) and `public/lunar/manifest.json` for full coordinate frames, units, source byte ranges, checksums, processing steps, alignment and limitations. Source grid spacing is not a claim of metre-scale terrain accuracy.

## Other graphics

Interface icons, decorative orbital lines and star backgrounds are made in code for AETHER. They are not sourced astronomical observations. See `docs/SOURCES.md` for scientific content and model limitations.

## Typography

`public/fonts/manrope.ttf` is the Manrope variable font by Mikhail Sharanda and contributors, downloaded from the [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/manrope). The original [SIL Open Font License 1.1](../public/fonts/OFL-Manrope.txt) is bundled alongside it. Served through `next/font/local`; there are no runtime requests to Google Fonts. Display headings use the device's Georgia/serif font stack.
