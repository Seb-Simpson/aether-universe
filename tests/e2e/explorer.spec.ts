import { expect, test, type Page } from "@playwright/test";

async function loadExplorer(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /^Saturn\.?$/ }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByTestId("scene-viewport")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect
    .poll(async () =>
      Number(await page.locator("canvas").getAttribute("data-geometries")),
    )
    .toBeGreaterThan(0);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-settled",
    "true",
  );
}

function observeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("loads a real scene, changes subjects, and opens sourced facts", async ({
  page,
}, info) => {
  const errors = observeErrors(page);
  await loadExplorer(page);
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-saturn.png`,
    fullPage: true,
  });
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-viewport.png`,
  });
  const resourcesBefore = await page
    .locator("canvas")
    .evaluate((canvas) => ({
      geometries: canvas.dataset.geometries,
      textures: canvas.dataset.textures,
    }));
  for (const name of ["Titan", "Enceladus", "Rhea", "Saturn"]) {
    await page
      .getByRole("button", { name: `Select ${name}`, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: new RegExp(`^${name}\\.?$`) }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Select ${name}`, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  const resourcesAfter = await page
    .locator("canvas")
    .evaluate((canvas) => ({
      geometries: canvas.dataset.geometries,
      textures: canvas.dataset.textures,
    }));
  expect(resourcesAfter).toEqual(resourcesBefore);
  await info.attach("renderer-resources", {
    body: JSON.stringify({ before: resourcesBefore, after: resourcesAfter }),
    contentType: "application/json",
  });
  await page
    .getByRole("button", { name: "Explore Saturn", exact: true })
    .click();
  const panel = page.getByRole("region", { name: "About Saturn", exact: true });
  await expect(panel).toBeVisible();
  await expect(
    panel.locator('a[href^="https://science.nasa.gov/"]').first(),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-facts.png`,
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("camera commands and pointer orbit produce distinct renderings", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  const errors = observeErrors(page);
  await loadExplorer(page);
  const canvas = page.locator("canvas");
  const initial = await canvas.screenshot();
  const initialDistance = Number(
    await canvas.getAttribute("data-camera-distance"),
  );
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-camera-distance")))
    .toBeLessThan(initialDistance * 0.9);
  expect((await canvas.screenshot()).equals(initial)).toBe(false);
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await page
    .getByRole("button", { name: "View from above", exact: true })
    .click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-camera-polar")))
    .toBeLessThan(0.2);
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-rings-above.png`,
  });
  await page.getByRole("button", { name: "Select Titan", exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-camera-distance")))
    .toBeCloseTo(2.333, 1);
  await page
    .getByRole("button", { name: "Select Saturn", exact: true })
    .click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-camera-distance")))
    .toBeCloseTo(initialDistance, 1);
  await page.getByRole("button", { name: "Oblique view", exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-camera-polar")))
    .toBeGreaterThan(1);
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-rings-oblique.png`,
  });
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (bounds) {
    await page.mouse.move(
      bounds.x + bounds.width * 0.6,
      bounds.y + bounds.height * 0.4,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width * 0.7,
      bounds.y + bounds.height * 0.6,
      { steps: 4 },
    );
    await page.mouse.up();
  }
  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-camera-distance")))
    .toBeCloseTo(initialDistance, 1);
  await page
    .getByRole("button", { name: "Enable slow rotation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause rotation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause rotation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Enable slow rotation", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("navigation, keyboard help, and reduced motion remain usable", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loadExplorer(page);
  await expect(
    page.getByRole("button", { name: "Enable slow rotation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Controls and accessibility", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("link", { name: "Field guide", exact: true })
    .first()
    .click();
  await expect(page.locator("#field-guide")).toBeInViewport();
  await page
    .getByRole("button", {
      name: info.project.name.startsWith("mobile")
        ? "Sources & credits"
        : "About Aether",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Select Titan", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /^Titan\.?$/ })).toBeVisible();
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Explore", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("button", { name: "Saturn system", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Saturn\.?$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Explore", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("keeps sourced information usable when WebGL is unavailable", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.getByText(/3D view unavailable/i)).toBeVisible();
  await page
    .getByRole("button", { name: "Select Enceladus", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Enceladus\.?$/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore Enceladus", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "About Enceladus", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-fallback.png`,
    fullPage: true,
  });
});

test("recovers to reading mode after an active WebGL context is lost", async ({
  page,
}) => {
  await loadExplorer(page);
  const supported = await page.locator("canvas").evaluate((canvas) => {
    const context = (canvas as HTMLCanvasElement).getContext("webgl2");
    const extension = context?.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  expect(supported).toBe(true);
  await expect(page.getByTestId("webgl-fallback")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Zoom in", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Select Titan", exact: true }).click();
  await page
    .getByRole("button", { name: "Explore Titan", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "About Titan", exact: true }),
  ).toBeVisible();
});
