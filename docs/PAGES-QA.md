# AETHER-001B verification

## Local static export

Executed on 14 November 2026. No visual or scene changes were made; the application now uses the `/aether-universe/` mount in Next and all public texture references.

- ESLint and TypeScript: pass.
- Vitest: 12/12 pass, including CSS/JavaScript asset-prefix contracts and local texture existence.
- Production static export: pass (`out/`).
- Existing desktop/mobile Playwright interaction journeys: 10/10 pass against exported files served at `http://127.0.0.1:3000/aether-universe/`, with no Next runtime server.
- Additional desktop/mobile Pages asset checks: 2/2 pass. All five texture maps return 200 with image content types; real JavaScript, CSS and local font requests succeed and use the repository prefix. No browser errors, failed requests or HTTP errors observed.
- Initial asset-test runs expected a WOFF2 font, but the bundled Manrope is TTF. Corrected the test to accept the actual bundled format and reran both cases successfully; no app or font modification was needed.
- Existing journeys verify Saturn/rings, zoom/reset/presets, moon selection, sourced panels, navigation, reduced motion, WebGL unavailable and active context loss.

Static desktop/mobile screenshots: `docs/screenshots/pages-desktop-chromium.png` and `pages-mobile-chromium.png`. Original foundation screenshots and QA report are preserved separately.

## Deployment

The credential could not enable Pages or change deployment environment policies (GitHub API 403). The user enabled Pages with GitHub Actions and then explicitly instructed publishing to main, superseding the initial no-main-change constraint. The workflow deploys main to satisfy the environment's existing main-only rule. A separate publishing commit on main preserves PR #1 as unmerged; the review branch still descends from the requested foundation commit.

Deployment **succeeded** via [Pages run 43626720741](https://github.com/Seb-Simpson/aether-universe/actions/runs/43626720741), build 2m59s / deploy 9s. Published main commit: `93503a12149e23a990336a54e4a68175a11fde4b`, with the exact application tree from review-branch commit `24accf47d1f3c09757c32477b0fb813ee18dcd6e`. Both PRs remain unmerged. The independent Verify AETHER workflow also succeeded.

Verified public URL: **https://seb-simpson.github.io/aether-universe/**. Anonymous HTTPS GET returned 200; the public icon returned 200. All 10 desktop/mobile interaction journeys passed against this public origin. Both additional public browser asset checks passed: scripts, styles, the bundled TTF font and all five texture maps succeed at the repository subpath, with no failed browser requests, HTTP errors or console errors.

An initial public asset probe using Playwright's Node request client could not traverse this environment's network proxy (ENETUNREACH/ECONNREFUSED). Chromium could access the site. The probe now uses browser fetch, matching actual application traffic; both public and local-export asset cases were rerun successfully. This was a test-harness connectivity issue, not a site outage.

Public screenshot captures: `docs/screenshots/pages-public-desktop-chromium.png` and `pages-public-mobile-chromium.png`. Subsequent review-branch evidence/test updates do not alter the published application. No further repository settings are required for the current main-based deployment.

## Limits

Tests use Chromium with software WebGL, desktop 1440×1000 and mobile 412×915 emulation. Safari, Firefox, physical-device GPU/battery performance and screen-reader certification were not tested. The scene's existing illustrative-scale disclosures and WebGL reading fallback remain unchanged.
