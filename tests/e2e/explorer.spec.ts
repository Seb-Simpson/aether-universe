import { expect, test, type Page, type Locator } from "@playwright/test";

async function number(canvas: Locator, name: string) {
  return Number(await canvas.getAttribute(`data-${name}`));
}
async function loadExplorer(page: Page) {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Saturn", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("scene-viewport")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-settled",
    "true",
  );
  await page.waitForTimeout(250);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-settled",
    "true",
  );
}
function observeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("requestfailed", (r) =>
    errors.push(`${r.url()}: ${r.failure()?.errorText}`),
  );
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  return errors;
}
async function noPageScroll(page: Page) {
  const result = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    x: scrollX,
    y: scrollY,
  }));
  expect(result.scrollWidth).toBeLessThanOrEqual(result.width);
  expect(result.scrollHeight).toBeLessThanOrEqual(result.height);
  expect(result.x).toBe(0);
  expect(result.y).toBe(0);
}
async function settle(page: Page, id: string) {
  await expect(page.locator("canvas")).toHaveAttribute("data-selected", id);
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-settled", "true");
}
async function select(page: Page, name: string) {
  await page
    .getByRole("button", { name: `Select ${name}`, exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-selected",
    name.toLowerCase(),
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-settled",
    "true",
  );
}
async function openViewOptions(page: Page) {
  const button = page.getByRole("button", {
    name: "View options",
    exact: true,
  });
  if ((await button.getAttribute("aria-expanded")) !== "true")
    await button.click();
}

test("viewport-first exploration keeps selection and sourced panels on screen", async ({
  page,
}, info) => {
  const errors = observeErrors(page);
  await loadExplorer(page);
  await noPageScroll(page);
  const canvas = page.locator("canvas");
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThanOrEqual(
    info.project.use.viewport!.width - 1,
  );
  expect(bounds!.height).toBeGreaterThanOrEqual(
    info.project.use.viewport!.height - 1,
  );
  await expect(
    page.getByRole("region", { name: "About Saturn", exact: true }),
  ).not.toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/002b/regression-${info.project.name.startsWith("mobile") ? "mobile" : "desktop"}.png`,
  });
  const resources = () =>
    canvas.evaluate((c) => ({
      geometries: c.dataset.geometries,
      textures: c.dataset.textures,
    }));
  for (const name of ["Titan", "Enceladus", "Rhea", "Saturn"]) {
    await select(page, name);
    await noPageScroll(page);
  }
  const warm = await resources();
  for (const name of ["Titan", "Enceladus", "Rhea", "Saturn"])
    await select(page, name);
  expect(await resources()).toEqual(warm);
  await page.getByRole("button", { name: "About Saturn", exact: true }).click();
  const panel = page.getByRole("region", { name: "About Saturn", exact: true });
  await expect(panel).toBeVisible();
  await expect(
    panel.locator('a[href^="https://science.nasa.gov/"]').first(),
  ).toBeVisible();
  await noPageScroll(page);
  await page.screenshot({
    path: `docs/screenshots/002b/regression-panel-${info.project.name}.png`,
  });
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "About Saturn", exact: true }),
  ).toBeFocused();
  await info.attach("renderer-resources", {
    body: JSON.stringify({ warm, after: await resources() }),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("camera zoom respects visual limits and presets reset accurately", async ({
  page,
}, info) => {
  test.setTimeout(100_000);
  const errors = observeErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loadExplorer(page);
  const canvas = page.locator("canvas");
  const initial = await number(canvas, "camera-distance");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(() => number(canvas, "camera-distance"))
    .toBeLessThan(initial * 0.96);
  for (let i = 0; i < 24; i++)
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(async () =>
      Math.abs(
        (await number(canvas, "camera-distance")) -
          (await number(canvas, "camera-min")),
      ),
    )
    .toBeLessThan(0.02);
  expect(await number(canvas, "camera-clearance")).toBeGreaterThanOrEqual(
    -0.001,
  );
  await expect(canvas).toHaveAttribute("data-camera-limit", "near");
  await openViewOptions(page);
  await page
    .getByRole("button", { name: "View from above", exact: true })
    .click();
  await expect.poll(() => number(canvas, "camera-polar")).toBeLessThan(0.25);
  expect(await number(canvas, "camera-clearance")).toBeGreaterThanOrEqual(
    -0.001,
  );
  await page.screenshot({
    path: `docs/screenshots/002b/regression-rings-above-${info.project.name}.png`,
  });
  await openViewOptions(page);
  await page.getByRole("button", { name: "Oblique view", exact: true }).click();
  await expect.poll(() => number(canvas, "camera-polar")).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  await expect
    .poll(() => number(canvas, "camera-distance"))
    .toBeCloseTo(initial, 1);
  for (const name of ["Titan", "Enceladus", "Rhea", "Saturn"]) {
    await select(page, name);
    const distance = await number(canvas, "camera-distance");
    expect(distance).toBeGreaterThanOrEqual(
      (await number(canvas, "camera-min")) - 0.01,
    );
    expect(await number(canvas, "camera-clearance")).toBeGreaterThanOrEqual(
      -0.001,
    );
  }
  await noPageScroll(page);
  expect(errors).toEqual([]);
});

test("mouse and touch orbit persist after release and wheel or pinch zooms", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  const errors = observeErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loadExplorer(page);
  const canvas = page.locator("canvas");
  const box = (await canvas.boundingBox())!;
  const before = await number(canvas, "camera-polar");
  const x = box.x + box.width * 0.5,
    y = box.y + box.height * 0.42;
  if (info.project.name.startsWith("mobile")) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 25, y: y + 60 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(async () =>
        Math.abs((await number(canvas, "camera-polar")) - before),
      )
      .toBeGreaterThan(0.03);
    const zoomBefore = await number(canvas, "camera-distance");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: x - 30, y },
        { x: x + 30, y },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x - 65, y },
        { x: x + 65, y },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() => number(canvas, "camera-distance"))
      .toBeLessThan(zoomBefore * 0.95);
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 35, y + 65, { steps: 3 });
    await expect
      .poll(async () =>
        Math.abs((await number(canvas, "camera-polar")) - before),
      )
      .toBeGreaterThan(0.03);
    const during = await number(canvas, "camera-polar");
    await page.mouse.up();
    await expect
      .poll(async () =>
        Math.abs((await number(canvas, "camera-polar")) - before),
      )
      .toBeGreaterThan(0.03);
    await page.waitForTimeout(350);
    expect(await number(canvas, "camera-polar")).toBeCloseTo(during, 2);
    const zoomBefore = await number(canvas, "camera-distance");
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, -350);
    await expect
      .poll(() => number(canvas, "camera-distance"))
      .toBeLessThan(zoomBefore * 0.98);
  }
  expect(await number(canvas, "camera-clearance")).toBeGreaterThanOrEqual(
    -0.001,
  );
  await noPageScroll(page);
  expect(errors).toEqual([]);
});

test("keyboard navigation, optional panels and reduced motion do not scroll the page", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loadExplorer(page);
  await page.getByRole("button", { name: "Select Titan", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Titan", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "About Titan", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "About Titan", exact: true }),
  ).toBeVisible();
  await noPageScroll(page);
  await page.keyboard.press("Escape");
  for (const name of ["About Aether", "Controls and accessibility"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await noPageScroll(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await openViewOptions(page);
  await expect(
    page.getByRole("button", { name: "Enable slow rotation", exact: true }),
  ).toBeDisabled();
  await noPageScroll(page);
  const escape = page.keyboard.press("Escape");
  await escape;
  await page
    .getByRole("button", { name: "Select Saturn", exact: true })
    .click();
  const viewport = page.getByRole("group", {
    name: "3D navigation viewport",
    exact: true,
  });
  await viewport.focus();
  const initialPolar = await number(page.locator("canvas"), "camera-polar");
  await page.keyboard.press("ArrowDown");
  await expect
    .poll(() => number(page.locator("canvas"), "camera-polar"))
    .toBeGreaterThan(initialPolar + 0.03);
  await page.keyboard.press("4");
  await expect(
    page.getByRole("heading", { name: "Rhea", exact: true }),
  ).toBeVisible();
  await noPageScroll(page);
});

test("reading fallback preserves contextual facts when WebGL is unavailable", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(type)) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("./");
  await expect(page.getByTestId("webgl-fallback")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Zoom in", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Select Enceladus", exact: true })
    .click();
  await page
    .getByRole("button", { name: "About Enceladus", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "About Enceladus", exact: true }),
  ).toBeVisible();
  await noPageScroll(page);
  await page.screenshot({
    path: `docs/screenshots/002b/regression-fallback-${info.project.name}.png`,
  });
});

test("active context loss tears down WebGL and preserves selection and facts", async ({
  page,
}) => {
  await loadExplorer(page);
  const lost = await page.locator("canvas").evaluate((c) => {
    const ext = (c as HTMLCanvasElement)
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context");
    ext?.loseContext();
    return !!ext;
  });
  expect(lost).toBe(true);
  await expect(page.getByTestId("webgl-fallback")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Zoom in", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Select Rhea", exact: true }).click();
  await page.getByRole("button", { name: "About Rhea", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "About Rhea", exact: true }),
  ).toBeVisible();
  await noPageScroll(page);
});

test("focus transfers remain clear, pause under dialogs and support interruption", async ({
  page,
}) => {
  test.setTimeout(100_000);
  const errors = observeErrors(page);
  await loadExplorer(page);
  const canvas = page.locator("canvas");
  await canvas.evaluate((c) => {
    const readings: number[] = [];
    const observer = new MutationObserver(() =>
      readings.push(Number(c.dataset.cameraClearance)),
    );
    observer.observe(c, {
      attributes: true,
      attributeFilter: ["data-camera-clearance"],
    });
    Object.assign(window, { __aetherClearances: readings });
  });
  await page.getByRole("button", { name: "Select Titan", exact: true }).click();
  await page
    .getByRole("button", { name: "Controls and accessibility", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(200);
  const pausedDistance = await number(canvas, "camera-distance");
  await page.waitForTimeout(600);
  expect(await number(canvas, "camera-distance")).toBeCloseTo(
    pausedDistance,
    3,
  );
  await page.keyboard.press("Escape");
  await settle(page, "titan");
  await page
    .getByRole("button", { name: "Select Enceladus", exact: true })
    .click();
  // A new gesture cancels a transfer but retains a pivot on the selected body.
  const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width * 0.48,
    box!.y + box!.height * 0.34,
    { steps: 3 },
  );
  await page.mouse.up();
  await expect
    .poll(() => number(canvas, "camera-focus-error"))
    .toBeLessThan(0.002);
  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  await settle(page, "enceladus");
  for (const name of ["Rhea", "Saturn", "Titan", "Saturn"])
    await select(page, name);
  const clearances = await page.evaluate(
    () => Reflect.get(window, "__aetherClearances") as number[],
  );
  expect(clearances.length).toBeGreaterThan(2);
  expect(Math.min(...clearances)).toBeGreaterThanOrEqual(-0.001);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (let i = 0; i < 22; i++)
    await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-camera-limit", "far");
  expect(await number(canvas, "camera-distance")).toBeCloseTo(
    await number(canvas, "camera-max"),
    2,
  );
  expect(errors).toEqual([]);
});
