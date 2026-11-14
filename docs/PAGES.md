# GitHub Pages deployment (AETHER-001B)

This branch starts at foundation commit `80ffad7e37935665f1674fdf35bc634c14f3c655`. Its PR targets `codex/aether-001-foundation`; the original plan published directly from that branch. The user subsequently authorized pushing the tested deployment to main to use the existing Pages environment rule. PR #1 is not merged by this task. The application design, scene, data and interactions are preserved.

## Configuration

Next exports the app to `out/` with `output: 'export'`, `basePath: '/aether-universe'` and `trailingSlash: true`. The fixed base path is shared with JavaScript texture references through `src/lib/paths.ts`. CSS public URLs use the same prefix, covered by a unit test. Next manages prefixed JavaScript/CSS/font URLs; no separate `assetPrefix` is needed. External NASA references and in-page fragment navigation are unchanged. There is no server-side API or image optimizer requirement.

The local server serves only exported files at the repository mount; it does not proxy Next or use an SPA catch-all. Missing files and wrong root paths return 404. `npm run dev` also opens at the same subpath.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run start
# Open http://localhost:3000/aether-universe/
```

To test the exported site (the Playwright fixture starts/stops the static server; stop any existing server on port 3000 first):

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

To test a deployed site without launching a local server:

```bash
AETHER_TEST_URL=https://seb-simpson.github.io/aether-universe/ npm run test:pages
```

## Repository settings

Repository administrator: open **Settings → Pages → Build and deployment → Source → GitHub Actions**:
https://github.com/Seb-Simpson/aether-universe/settings/pages

If Pages is not enabled, selecting GitHub Actions creates the Pages site. Do not select a `main` or `gh-pages` folder source. If Actions are restricted, permit `actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages` (and `actions/upload-artifact` for verification evidence).

Under **Settings → Environments → github-pages**, allow deployments from `main` (the existing default rule). Any required environment review must be approved by a repository administrator. The default repository branch stays unchanged; its contents are updated under the user’s subsequent authorization.

## Workflow

`.github/workflows/pages.yml` deploys pushes to **main**. The build job has only `contents: read` and `pages: read` (to read Pages configuration), installs with `npm ci`, runs lint/type/unit validation, configures Pages, builds, adds `.nojekyll`, and runs desktop/mobile Playwright against the exported files before uploading `out/` with the official Pages artifact action. The deploy job alone gets `pages: write` and `id-token: write` and deploys to the `github-pages` environment using the official deployment action. Deployments are serialized. No secret, paid service or new package is required.

Push an approved update to main to redeploy, or rerun an existing deployment in Actions. The deployment branch remains available as a review record. Moving the publishing branch later requires an intentional workflow/environment policy update.

Expected URL: https://seb-simpson.github.io/aether-universe/

A successful local export is not proof of a live Pages site. Deployment and public verification results are recorded separately in `docs/PAGES-QA.md`.

## Limits

Hosting requires no Node server. The included Node static server is a local validation utility. The base path is fixed to this repository; a custom domain or renamed repository needs matching Next configuration, CSS and tests. GitHub Pages has no dynamic server features; the existing application does not require them. WebGL availability still depends on the user's browser/device, and the reading fallback remains available. Chromium desktop/mobile emulation does not certify Safari/Firefox or physical-device GPU performance.
