import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const require = createRequire(new URL("../package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const { PerspectiveCamera, Vector3 } = require("three");
const browser = await chromium.launch({
  headless: true,
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const results = [];
for (const config of [
  { name: "tablet", width: 1024, height: 768, isMobile: false },
  { name: "narrow-mobile", width: 360, height: 800, isMobile: true },
]) {
  const context = await browser.newContext({
    viewport: { width: config.width, height: config.height },
    isMobile: config.isMobile,
    hasTouch: config.isMobile,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  const start = Date.now();
  await page.goto(process.env.AETHER_TEST_URL ?? "http://127.0.0.1:3000/aether-universe/");
  const canvas = page.locator("canvas");
  await page.getByTestId("scene-viewport").waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="scene-viewport"]')?.dataset
        .ready === "true",
  );
  // Let the initial ResizeObserver update schedule responsive camera fitting.
  await page.waitForTimeout(250);
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.cameraSettled === "true",
  );
  const readyMs = Date.now() - start;
  const initial = await canvas.evaluate((c) => ({ ...c.dataset }));
  const layout = await page.evaluate(() => ({
    viewport: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  await page.screenshot({
    path: `docs/screenshots/${config.name}-viewport.png`,
  });
  const controls = [];
  for (const name of [
    "Oblique view",
    "View from above",
    "Zoom in",
    "Zoom out",
    "Reset camera",
    "Enable slow rotation",
    "Controls and accessibility",
  ]) {
    const button = page.getByRole("button", { name, exact: true });
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    controls.push({
      name,
      box,
      reachable:
        !!box &&
        box.x >= 0 &&
        box.x + box.width <= config.width &&
        box.y >= 0 &&
        box.y + box.height <= config.height,
    });
  }
  // Sample an idle view before gesture damping or camera transitions.
  const frameBefore = await canvas.screenshot();
  await page.waitForTimeout(1000);
  const frameAfter = await canvas.screenshot();
  let touchOrbit = null;
  let pointerOrbit = null;
  if (!config.isMobile) {
    // Remove damping to verify that releasing a drag keeps its viewpoint.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () =>
        document.querySelector('[aria-label="Enable slow rotation"]')
          ?.disabled === true,
    );
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    const before = Number(await canvas.getAttribute("data-camera-polar"));
    const x = box.x + box.width * 0.5,
      y = box.y + box.height * 0.35;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 35, y + 65, { steps: 3 });
    const during = Number(await canvas.getAttribute("data-camera-polar"));
    await page.mouse.up();
    await page.waitForTimeout(800);
    const after = Number(await canvas.getAttribute("data-camera-polar"));
    pointerOrbit = {
      before,
      during,
      after,
      changed: Math.abs(before - after) > 0.1,
      retainedAfterRelease: Math.abs(during - after) < 0.01,
    };
    await page
      .getByRole("button", { name: "Reset camera", exact: true })
      .click();
    await page.waitForTimeout(250);
    await page.waitForFunction(
      () => document.querySelector("canvas")?.dataset.cameraSettled === "true",
    );
  }
  if (config.isMobile) {
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    const before = Number(await canvas.getAttribute("data-camera-polar"));
    const cdp = await context.newCDPSession(page);
    const x = box.x + box.width * 0.5,
      y = box.y + box.height * 0.35;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 35, y: y + 65 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.waitForTimeout(800);
    const after = Number(await canvas.getAttribute("data-camera-polar"));
    touchOrbit = { before, after, changed: Math.abs(before - after) > 0.01 };
    await page
      .getByRole("button", { name: "Reset camera", exact: true })
      .click();
    await page.waitForTimeout(250);
    await page.waitForFunction(
      () => document.querySelector("canvas")?.dataset.cameraSettled === "true",
    );
  }
  let resourcesAfter = await canvas.evaluate((c) => ({ ...c.dataset }));
  if (!config.isMobile) {
    for (const name of [
      "Titan",
      "Enceladus",
      "Rhea",
      "Saturn",
      "Titan",
      "Enceladus",
      "Rhea",
      "Saturn",
    ]) {
      await page
        .getByRole("button", { name: `Select ${name}`, exact: true })
        .click();
      await page.waitForFunction((selected) => {
        const canvas = document.querySelector("canvas");
        return (
          canvas?.dataset.selected === selected &&
          canvas.dataset.cameraSettled === "true"
        );
      }, name.toLowerCase());
    }
    resourcesAfter = await canvas.evaluate((c) => ({ ...c.dataset }));
  }
  const directSelections = [];
  if (!config.isMobile) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    // Project the authored scene coordinates to test actual mesh raycasting.
    for (const [id, position] of [
      ["titan", [5.4, 0.7, -2.8]],
      ["enceladus", [-5.35, -0.8, 1.4]],
      ["rhea", [4.6, -1.6, 3.6]],
    ]) {
      await page
        .getByRole("button", { name: "Select Saturn", exact: true })
        .click();
      await page.waitForFunction(() => {
        const c = document.querySelector("canvas");
        return (
          c?.dataset.selected === "saturn" && c.dataset.cameraSettled === "true"
        );
      });
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      const camera = new PerspectiveCamera(
        40,
        box.width / box.height,
        0.05,
        120,
      );
      camera.position.set(0, 3.8, 11.8);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const projected = new Vector3(...position).project(camera);
      const x = box.x + ((projected.x + 1) / 2) * box.width;
      const y = box.y + ((1 - projected.y) / 2) * box.height;
      await page.mouse.click(x, y);
      await page.waitForFunction(
        (selected) =>
          document.querySelector("canvas")?.dataset.selected === selected,
        id,
      );
      directSelections.push({ id, x, y, selectedFromMesh: true });
    }
  }
  results.push({
    name: config.name,
    viewport: { width: config.width, height: config.height },
    readyMs,
    layout,
    controls,
    touchOrbit,
    pointerOrbit,
    directSelections,
    pausedFramesIdentical: frameBefore.equals(frameAfter),
    initial,
    resourcesAfter,
    errors,
  });
  await context.close();
}
await browser.close();
writeFileSync("docs/qa-metrics.json", JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
for (const result of results) {
  assert.equal(
    result.layout.scrollWidth,
    result.layout.viewport,
    `${result.name}: horizontal overflow`,
  );
  assert.ok(
    result.controls.every((control) => control.reachable),
    `${result.name}: unreachable camera control`,
  );
  assert.ok(
    result.pausedFramesIdentical,
    `${result.name}: scene changed while paused`,
  );
  assert.equal(
    result.initial.geometries,
    result.resourcesAfter.geometries,
    `${result.name}: geometry allocations grew`,
  );
  assert.equal(
    result.initial.textures,
    result.resourcesAfter.textures,
    `${result.name}: texture allocations grew`,
  );
  assert.deepEqual(result.errors, [], `${result.name}: browser errors`);
  if (result.pointerOrbit)
    assert.ok(
      result.pointerOrbit.changed,
      "Pointer orbit did not move the camera",
    );
  if (result.pointerOrbit)
    assert.ok(
      result.pointerOrbit.retainedAfterRelease,
      "Releasing pointer drag reset the camera",
    );
  if (result.touchOrbit)
    assert.ok(result.touchOrbit.changed, "Touch orbit did not move the camera");
}
