import { expect, test } from "@playwright/test";

test("export serves prefixed bundles, maps and fonts without root-relative requests", async ({
  page,
  request,
}, info) => {
  const errors: string[] = [];
  const assets: string[] = [];
  const mount = "/aether-universe/";
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("requestfailed", (r) =>
    errors.push(`${r.url()}: ${r.failure()?.errorText}`),
  );
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    if (
      ["script", "stylesheet", "font", "image"].includes(
        r.request().resourceType(),
      )
    )
      assets.push(r.url());
  });
  await page.goto("./");
  await expect(page.getByTestId("scene-viewport")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-settled",
    "true",
  );
  await page.evaluate(() => document.fonts.ready);
  for (const file of [
    "saturn.jpg",
    "saturn-ring.png",
    "titan.jpg",
    "enceladus.jpg",
    "rhea.jpg",
  ]) {
    const response = await request.get(`textures/${file}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^image\//);
  }
  for (const kind of [/\.js(?:\?|$)/, /\.css(?:\?|$)/, /\.(?:woff2|ttf)(?:\?|$)/])
    expect(assets.some((url) => kind.test(url))).toBe(true);
  for (const url of assets)
    expect(new URL(url).pathname).toMatch(/^\/aether-universe\//);
  expect(new URL(page.url()).pathname).toBe(mount);
  await page.screenshot({
    path: `docs/screenshots/pages-${info.project.name}.png`,
  });
  expect(errors).toEqual([]);
});
