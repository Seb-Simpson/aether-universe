import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { PerspectiveCamera, Vector3 } from "three";

// Run against an already running export server; no Next runtime is involved.
const url =
  process.env.AETHER_TEST_URL ?? "http://127.0.0.1:3000/aether-universe/";
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const results = [];
try {
  for (const config of [
    { name: "tablet", width: 1024, height: 768, mobile: false },
    { name: "narrow", width: 360, height: 800, mobile: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: config.width, height: config.height },
      deviceScaleFactor: 1,
      isMobile: config.mobile,
      hasTouch: config.mobile,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("requestfailed", (r) =>
      errors.push(`${r.url()}: ${r.failure()?.errorText}`),
    );
    const started = Date.now();
    await page.goto(url);
    const canvas = page.locator("canvas");
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="scene-viewport"]')?.dataset
          .ready === "true",
    );
    await page.waitForTimeout(300);
    await page.waitForFunction(
      () => document.querySelector("canvas")?.dataset.cameraSettled === "true",
    );
    const readyAndSettledMs = Date.now() - started;
    const initial = await canvas.evaluate((c) => ({ ...c.dataset }));
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      scrollX,
      scrollY,
      canvasBounds: document
        .querySelector("canvas")
        .getBoundingClientRect()
        .toJSON(),
    }));
    await page.screenshot({
      path: `docs/screenshots/002a/after-${config.name}.png`,
    });
    const frameBefore = await canvas.screenshot();
    const frameCountBefore = await canvas.getAttribute("data-frame");
    await page.waitForTimeout(1000);
    const frameAfter = await canvas.screenshot();
    const frameCountAfter = await canvas.getAttribute("data-frame");
    const controls = [];
    for (const name of [
      "Select Saturn",
      "Select Titan",
      "Select Enceladus",
      "Select Rhea",
      "About Saturn",
      "Zoom in",
      "Zoom out",
      "Reset camera",
      "View options",
      "Controls and accessibility",
    ]) {
      const button = page.getByRole("button", { name, exact: true });
      const box = await button.boundingBox();
      controls.push({
        name,
        box,
        reachable:
          !!box &&
          box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= config.width + 0.5 &&
          box.y + box.height <= config.height + 0.5,
      });
    }
    const geometrySamples = [];
    const textureSamples = [];
    const lodSamples = [];
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const name of ["Titan", "Enceladus", "Rhea", "Saturn"]) {
        await page
          .getByRole("button", { name: `Select ${name}`, exact: true })
          .click();
        await page.waitForFunction((id) => {
          const c = document.querySelector("canvas");
          return (
            c?.dataset.selected === id && c.dataset.cameraSettled === "true"
          );
        }, name.toLowerCase());
        await page.waitForTimeout(150);
        const telemetry = await canvas.evaluate((c) => ({ ...c.dataset }));
        geometrySamples.push(Number(telemetry.geometries));
        textureSamples.push(Number(telemetry.textures));
        lodSamples.push({
          body: name,
          tier: telemetry[`lod${name}`],
          triangles: telemetry.triangles,
          clearance: telemetry.cameraClearance,
          distance: telemetry.cameraDistance,
          min: telemetry.cameraMin,
          max: telemetry.cameraMax,
        });
        assert.ok(
          Number(telemetry.cameraClearance) >= -0.001,
          `${name} collision clearance`,
        );
      }
    }
    await page
      .getByRole("button", { name: "About Saturn", exact: true })
      .click();
    const panel = page.getByRole("region", {
      name: "About Saturn",
      exact: true,
    });
    await panel.waitFor({ state: "visible" });
    const panelScroll = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      scrollY,
    }));
    await page.keyboard.press("Escape");
    const final = await canvas.evaluate((c) => ({ ...c.dataset }));
    results.push({
      name: config.name,
      url,
      readyAndSettledMs,
      layout,
      controls,
      initial,
      final,
      pausedFramesIdentical: frameBefore.equals(frameAfter),
      idleFrames: { before: frameCountBefore, after: frameCountAfter },
      geometrySamples,
      textureSamples,
      lodSamples,
      panelScroll,
      errors,
    });
    assert.equal(
      layout.scrollWidth,
      config.width,
      `${config.name}: horizontal overflow`,
    );
    assert.equal(
      layout.scrollHeight,
      config.height,
      `${config.name}: document scroll`,
    );
    assert.equal(layout.scrollY, 0);
    assert.equal(panelScroll.height, config.height);
    assert.equal(panelScroll.scrollY, 0);
    assert.ok(
      layout.canvasBounds.width >= config.width - 1 &&
        layout.canvasBounds.height >= config.height - 1,
      `${config.name}: scene doesn't fill viewport`,
    );
    assert.ok(
      controls.every((c) => c.reachable),
      `${config.name}: hidden HUD control`,
    );
    assert.ok(
      frameBefore.equals(frameAfter),
      `${config.name}: visible animation while idle`,
    );
    assert.ok(
      Math.max(...geometrySamples) <= 5,
      `${config.name}: unbounded geometry pool`,
    );
    assert.equal(
      new Set(textureSamples).size,
      1,
      `${config.name}: texture allocations grow`,
    );
    assert.equal(
      new Set(geometrySamples.slice(4)).size,
      1,
      `${config.name}: allocations grow after warmup`,
    );
    assert.deepEqual(errors, []);
    if (!config.mobile) {
      // Raycast the real LOD meshes, not just the DOM object selector.
      await page.setViewportSize({ width: 1440, height: 1000 });
      for (const [id, position] of [
        ["titan", [5.4, 0.7, -2.8]],
        ["enceladus", [-5.35, -0.8, 1.4]],
        ["rhea", [4.6, -1.6, 3.6]],
      ]) {
        await page
          .getByRole("button", { name: "Select Saturn", exact: true })
          .click();
        await page.waitForFunction(() => {
          const canvas = document.querySelector("canvas");
          return (
            canvas?.dataset.selected === "saturn" &&
            canvas.dataset.cameraSettled === "true"
          );
        });
        const box = await canvas.boundingBox();
        const camera = new PerspectiveCamera(
          40,
          box.width / box.height,
          0.05,
          200,
        );
        camera.position.set(0, 3.8, 11.8);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        const point = new Vector3(...position).project(camera);
        await page.mouse.click(
          box.x + ((point.x + 1) * box.width) / 2,
          box.y + ((1 - point.y) * box.height) / 2,
        );
        await page.waitForFunction(
          (selected) =>
            document.querySelector("canvas")?.dataset.selected === selected,
          id,
        );
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(
  "docs/screenshots/002a/after-metrics.json",
  JSON.stringify(results, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    results.map((r) => ({
      name: r.name,
      layout: r.layout,
      initial: r.initial,
      final: r.final,
      pausedFramesIdentical: r.pausedFramesIdentical,
      errors: r.errors,
    })),
    null,
    2,
  ),
);
