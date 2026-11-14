# Bundled asset provenance and licences

All runtime textures are served locally. No paid API, image host, external font, or account is required to run the application. Retrieved **14 November 2026**.

## Saturn

**Credit: Solar System Scope, https://www.solarsystemscope.com/textures/**

| Local asset | Original download | Resolution | Licence |
| --- | --- | --- | --- |
| `public/textures/saturn.jpg` | [2K Saturn texture](https://www.solarsystemscope.com/textures/download/2k_saturn.jpg) | 2048 × 1024 | [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) |
| `public/textures/saturn-ring.png` | [2K Saturn ring texture](https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png) | 2048 × 125 RGBA | [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) |

The [provider's texture page](https://www.solarsystemscope.com/textures/) explicitly permits use, adaptation and redistribution, including commercial use, under CC BY 4.0. Downloads are bundled without pixel modifications; runtime UV mapping, lighting, materials and tone mapping affect their appearance. Retain attribution and licence links when redistributing or adapting them. These maps are visualization assets, not raw scientific measurements.

## Moons

**Credit: NASA / NASA 3D Resources.**

Downloaded unchanged from the official [NASA-3D-Resources repository](https://github.com/nasa/NASA-3D-Resources), pinned at commit `11ebb4ee043715aefbba6aeec8a61746fad67fa7`.

| Local asset | Original repository path | Resolution |
| --- | --- | --- |
| `public/textures/titan.jpg` | [Saturn - Titan.jpg](https://github.com/nasa/NASA-3D-Resources/blob/11ebb4ee043715aefbba6aeec8a61746fad67fa7/Images%20and%20Textures/Saturn%20-%20Titan/Saturn%20-%20Titan.jpg) | 720 × 360 |
| `public/textures/enceladus.jpg` | [Saturn - Enceladus.jpg](https://github.com/nasa/NASA-3D-Resources/blob/11ebb4ee043715aefbba6aeec8a61746fad67fa7/Images%20and%20Textures/Saturn%20-%20Enceladus/Saturn%20-%20Enceladus.jpg) | 1440 × 720 |
| `public/textures/rhea.jpg` | [Saturn - Rhea.jpg](https://github.com/nasa/NASA-3D-Resources/blob/11ebb4ee043715aefbba6aeec8a61746fad67fa7/Images%20and%20Textures/Saturn%20-%20Rhea/Saturn%20-%20Rhea.jpg) | 1440 × 720 |

NASA's repository [README](https://github.com/nasa/NASA-3D-Resources/blob/11ebb4ee043715aefbba6aeec8a61746fad67fa7/README.md) describes these assets as “free and without copyright” and points to [NASA's images and media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). NASA material generally is not subject to copyright in the United States; NASA insignia and endorsement rights are separate. This product does not use NASA logos or imply NASA endorsement.

The moon maps are historical visualization maps, with finite resolution and coverage limitations. Titan's map represents its hazy appearance, not a detailed visible-light map of its obscured surface. Colour, illumination and apparent scale in this application are illustrative.

## Other graphics

Interface icons, decorative orbital lines and star backgrounds are made in code for AETHER. They are not sourced astronomical observations. See `docs/SOURCES.md` for scientific content and model limitations.

## Typography

`public/fonts/manrope.ttf` is the Manrope variable font by Mikhail Sharanda and contributors, downloaded from the [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/manrope). The original [SIL Open Font License 1.1](../public/fonts/OFL-Manrope.txt) is bundled alongside it. Served through `next/font/local`; there are no runtime requests to Google Fonts. Display headings use the device's Georgia/serif font stack.
