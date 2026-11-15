import { expect, test, type Page, type Locator } from "@playwright/test";

const evidence = "docs/screenshots/002b";
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.origin === new URL(page.url()).origin &&
      !url.pathname.startsWith("/aether-universe/")
    )
      errors.push(`Unprefixed asset: ${request.url()}`);
  });
  page.on("requestfailed", (request) => {
    // AbortController cancellation is expected when moving between terrain generations.
    if (!request.failure()?.errorText.includes("ERR_ABORTED"))
      errors.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  return errors;
}
async function value(canvas: Locator, name: string) {
  return Number(await canvas.getAttribute(`data-${name}`));
}
async function settleOrbit(page: Page) {
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-navigation-mode",
    "orbit",
    { timeout: 30000 },
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-settled",
    "true",
    { timeout: 30_000 },
  );
}
async function hold(
  page: Page,
  button: Locator,
  milliseconds: number,
  touch: boolean,
) {
  if (touch) {
    const box = (await button.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await page.waitForTimeout(milliseconds);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await button.hover();
    await page.mouse.down();
    await page.waitForTimeout(milliseconds);
    await page.mouse.up();
  }
}
async function moon(page: Page) {
  await page.goto("./");
  await expect(page.getByTestId("scene-viewport")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Select Moon", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-selected", "moon");
  await settleOrbit(page);
}
async function surface(page: Page) {
  await page
    .getByRole("button", { name: "Approach region", exact: true })
    .click();
  await settleOrbit(page);
  await page
    .getByRole("button", { name: "Explore surface", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-navigation-mode",
    "surface",
  );
  await expect
    .poll(() => value(page.locator("canvas"), "terrain-tiles"), {
      timeout: 30_000,
    })
    .toBeGreaterThan(0);
}
async function noDocumentScroll(page: Page) {
  const layout = await page.evaluate(() => ({
    height: innerHeight,
    width: innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollX,
    scrollY,
  }));
  expect(layout.scrollHeight).toBe(layout.height);
  expect(layout.scrollWidth).toBe(layout.width);
  expect(layout.scrollX).toBe(0);
  expect(layout.scrollY).toBe(0);
}

test("Moon globe, approach and real terrain expose increasing measured detail", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await moon(page);
  const canvas = page.locator("canvas");
  await noDocumentScroll(page);
  await page.screenshot({
    path: `${evidence}/lunar-globe-${info.project.name}.png`,
  });
  await page.getByRole("button", { name: "About Moon", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "About Moon", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "NASA Science · Moon facts", exact: true }),
  ).toHaveAttribute("href", "https://science.nasa.gov/moon/facts/");
  await noDocumentScroll(page);
  await page
    .getByRole("button", { name: "Close information panel", exact: true })
    .click();
  const initial = await value(canvas, "camera-distance");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(() => value(canvas, "camera-distance"))
    .toBeLessThan(initial);
  await settleOrbit(page);
  await page.screenshot({
    path: `${evidence}/lunar-medium-orbit-${info.project.name}.png`,
  });
  await page
    .getByRole("button", { name: "Approach region", exact: true })
    .click();
  await settleOrbit(page);
  await page.screenshot({
    path: `${evidence}/lunar-close-approach-${info.project.name}.png`,
  });
  await page
    .getByRole("button", { name: "Explore surface", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-navigation-mode", "surface");
  await expect
    .poll(() => value(canvas, "terrain-tiles"), { timeout: 30_000 })
    .toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute("data-terrain-loading", "false", {
    timeout: 30000,
  });
  await expect(canvas).toHaveAttribute("data-terrain-morphing", "false", {
    timeout: 30000,
  });
  const far = await canvas.evaluate((c) => ({ ...c.dataset }));
  await page.screenshot({
    path: `${evidence}/lunar-high-terrain-${info.project.name}.png`,
  });
  for (let step = 0; step < 14; step++)
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(() => value(canvas, "terrain-level"), { timeout: 30_000 })
    .toBeGreaterThan(Number(far.terrainLevel));
  await expect(canvas).toHaveAttribute("data-terrain-loading", "false", {
    timeout: 30_000,
  });
  await expect(canvas).toHaveAttribute("data-terrain-morphing", "false", {
    timeout: 30000,
  });
  const near = await canvas.evaluate((c) => ({ ...c.dataset }));
  expect(Number(near.terrainClearance)).toBeGreaterThanOrEqual(0);
  expect(Number(near.terrainFinestSpacing)).toBeLessThan(
    Number(far.terrainFinestSpacing),
  );
  expect(Number(near.terrainSourceSamples)).toBeGreaterThan(
    Number(far.terrainSourceSamples),
  );
  expect(Number(near.terrainAltitude)).toBeLessThan(
    Number(far.terrainAltitude),
  );
  await noDocumentScroll(page);
  await page.screenshot({
    path: `${evidence}/lunar-low-surface-${info.project.name}.png`,
  });
  await hold(
    page,
    page.getByRole("button", { name: "Descend", exact: true }),
    1000,
    info.project.name.startsWith("mobile"),
  );
  expect(await value(canvas, "terrain-clearance")).toBeGreaterThanOrEqual(44.9);
  await info.attach("progressive-detail", {
    body: JSON.stringify({ far, near }, null, 2),
    contentType: "application/json",
  });
  await page
    .getByRole("button", { name: "Return to orbit", exact: true })
    .click();
  await expect(canvas).not.toHaveAttribute("data-navigation-mode", "surface");
  await settleOrbit(page);
  await page
    .getByRole("button", { name: "Select Saturn", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-selected", "saturn");
  await settleOrbit(page);
  expect(errors).toEqual([]);
});

test("surface flight, terrain collision, touch look and repeated return remain bounded", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await moon(page);
  await surface(page);
  const canvas = page.locator("canvas");
  const before = await canvas.evaluate((c) => ({ ...c.dataset }));
  const forward = page.getByRole("button", {
    name: "Fly forward",
    exact: true,
  });
  await hold(page, forward, 900, info.project.name.startsWith("mobile"));
  await expect
    .poll(async () => {
      const now = await canvas.evaluate((c) => ({ ...c.dataset }));
      return Math.hypot(
        Number(now.terrainPositionX) - Number(before.terrainPositionX),
        Number(now.terrainPositionZ) - Number(before.terrainPositionZ),
      );
    })
    .toBeGreaterThan(1);
  if (!info.project.name.startsWith("mobile")) {
    const startZ = await value(canvas, "terrain-position-z");
    await page.keyboard.down("w");
    try {
      await expect
        .poll(
          async () =>
            Math.abs((await value(canvas, "terrain-position-z")) - startZ),
          { timeout: 10000 },
        )
        .toBeGreaterThan(1);
    } finally {
      await page.keyboard.up("w");
    }
  }
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width * 0.4,
    y = box.y + box.height * 0.35;
  if (info.project.name.startsWith("mobile")) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 35, y: y + 25 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 45, y + 25, { steps: 4 });
    await page.mouse.up();
  }
  const descend = page.getByRole("button", { name: "Descend", exact: true });
  await hold(page, descend, 2000, info.project.name.startsWith("mobile"));
  expect(await value(canvas, "terrain-clearance")).toBeGreaterThanOrEqual(0);
  await noDocumentScroll(page);
  await page
    .getByRole("button", { name: "Return to orbit", exact: true })
    .click();
  await settleOrbit(page);
  const orbitResources = await canvas.evaluate((c) => ({
    geometries: Number(c.dataset.geometries),
    textures: Number(c.dataset.textures),
  }));
  for (let cycle = 0; cycle < 3; cycle++) {
    await surface(page);
    await expect(canvas).toHaveAttribute("data-terrain-loading", "false", {
      timeout: 30_000,
    });
    expect(await value(canvas, "terrain-clearance")).toBeGreaterThanOrEqual(0);
    await page
      .getByRole("button", { name: "Return to orbit", exact: true })
      .click();
    await settleOrbit(page);
  }
  const afterResources = await canvas.evaluate((c) => ({
    geometries: Number(c.dataset.geometries),
    textures: Number(c.dataset.textures),
  }));
  expect(afterResources.geometries).toBeLessThanOrEqual(
    orbitResources.geometries + 1,
  );
  expect(afterResources.textures).toBeLessThanOrEqual(
    orbitResources.textures + 1,
  );
  await info.attach("surface-lifecycle", {
    body: JSON.stringify({ orbitResources, afterResources }),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("lunar WebGL context loss can recover into a fresh scene and resume terrain", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await moon(page);
  await surface(page);
  expect(
    await page.locator("canvas").evaluate((c) => {
      const ext = (c as HTMLCanvasElement)
        .getContext("webgl2")
        ?.getExtension("WEBGL_lose_context");
      ext?.loseContext();
      return !!ext;
    }),
  ).toBe(true);
  await expect(page.getByTestId("webgl-fallback")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Retry 3D", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-selected", "moon");
  await settleOrbit(page);
  await surface(page);
  expect(
    await value(page.locator("canvas"), "terrain-clearance"),
  ).toBeGreaterThanOrEqual(45);
  await page
    .getByRole("button", { name: "Return to orbit", exact: true })
    .click();
  await settleOrbit(page);
});

test("unavailable fine tiles retain measured parent terrain and a usable return", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route(/\/lunar\/tiles\/4\/.*\.bin$/, (route) =>
    route.fulfill({ status: 503, body: "Simulated unavailable fine tile" }),
  );
  await moon(page);
  await surface(page);
  for (let i = 0; i < 10; i++)
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(
    page.getByText("Some tiles unavailable; parent detail retained", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 30_000 });
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-terrain-loading", "false", {
    timeout: 30_000,
  });
  expect(await value(canvas, "terrain-tiles")).toBeGreaterThan(0);
  expect(await value(canvas, "terrain-level")).toBeLessThan(4);
  expect(await value(canvas, "terrain-clearance")).toBeGreaterThanOrEqual(45);
  await page
    .getByRole("button", { name: "Return to orbit", exact: true })
    .click();
  await settleOrbit(page);
  await noDocumentScroll(page);
});
