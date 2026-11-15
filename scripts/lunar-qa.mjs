import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices } from "@playwright/test";

// Against an already running static export, never the Next development server.
// npm run build && npm run start (separate terminal), then node scripts/lunar-qa.mjs.
const url =
  process.env.AETHER_TEST_URL ?? "http://127.0.0.1:3000/aether-universe/";
const output = "docs/screenshots/002b";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const results = [];
const dataset = (page) =>
  page.locator("canvas").evaluate((canvas) => ({ ...canvas.dataset }));
const button = (page, name) => page.getByRole("button", { name, exact: true });
async function orbitSettled(page) {
  await page.waitForFunction(
    () => {
      const c = document.querySelector("canvas");
      return (
        c?.dataset.selected === "moon" &&
        c.dataset.navigationMode === "orbit" &&
        c.dataset.cameraSettled === "true"
      );
    },
    null,
    { timeout: 45_000 },
  );
}
async function surfaceSettled(page) {
  await page.waitForFunction(
    () => {
      const d = document.querySelector("canvas")?.dataset;
      return (
        d?.navigationMode === "surface" &&
        Number(d.terrainTiles) > 0 &&
        d.cameraSettled === "true" &&
        d.terrainLoading === "false" &&
        d.terrainMorphing === "false"
      );
    },
    null,
    { timeout: 60_000 },
  );
}
async function enterSurface(page) {
  await button(page, "Approach region").click();
  await orbitSettled(page);
  await button(page, "Explore surface").click();
  await surfaceSettled(page);
}
async function returnToOrbit(page) {
  await button(page, "Return to orbit").click();
  await orbitSettled(page);
  return dataset(page);
}
async function heapMetrics(cdp) {
  // Renderer allocations are taken from Three; Chromium's heap is a separate
  // CPU metric and does not represent GPU memory or total browser process RSS.
  await cdp.send("HeapProfiler.collectGarbage");
  const { metrics } = await cdp.send("Performance.getMetrics");
  const wanted = [
    "JSHeapUsedSize",
    "JSHeapTotalSize",
    "Nodes",
    "Documents",
    "ScriptDuration",
    "TaskDuration",
  ];
  return Object.fromEntries(
    metrics
      .filter(({ name }) => wanted.includes(name))
      .map(({ name, value }) => [name, value]),
  );
}
async function holdFlight(page, name, duration, touch) {
  const box = await button(page, name).boundingBox();
  assert.ok(box, `${name} must be reachable`);
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    try {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
      });
      await page.waitForTimeout(duration);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } finally {
      await cdp.detach();
    }
  } else {
    await button(page, name).hover();
    await page.mouse.down();
    await page.waitForTimeout(duration);
    await page.mouse.up();
  }
}
try {
  for (const config of [
    { name: "desktop", viewport: { width: 1440, height: 1000 }, mobile: false },
    { name: "mobile", viewport: { width: 412, height: 915 }, mobile: true },
  ]) {
    const context = await browser.newContext({
      ...(config.mobile ? devices["Pixel 7"] : devices["Desktop Chrome"]),
      viewport: config.viewport,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const errors = [],
      failures = [],
      responses = [],
      cancellations = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("requestfailed", (request) => {
      const failure = {
        url: request.url(),
        error: request.failure()?.errorText,
      };
      if (failure.error?.includes("ERR_ABORTED")) cancellations.push(failure);
      else failures.push(failure);
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        failures.push({ url: response.url(), status: response.status() });
      if (response.url().includes("/lunar/"))
        responses.push({ url: response.url(), status: response.status() });
    });
    const timings = {};
    let started = performance.now();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="scene-viewport"]')?.dataset
          .ready === "true",
      null,
      { timeout: 60_000 },
    );
    timings.initialSaturnReadyMs = Math.round(performance.now() - started);
    started = performance.now();
    await button(page, "Select Moon").click();
    await page.waitForFunction(
      () => document.querySelector("canvas")?.dataset.selected === "moon",
      null,
      { timeout: 45_000 },
    );
    await orbitSettled(page);
    timings.moonGlobeReadyMs = Math.round(performance.now() - started);
    const globe = await dataset(page);
    const heapBefore = await heapMetrics(cdp);
    started = performance.now();
    await enterSurface(page);
    timings.firstSurfaceReadyMs = Math.round(performance.now() - started);
    const far = await dataset(page);
    started = performance.now();
    for (let step = 0; step < 8; step++) {
      await button(page, "Zoom in").click();
      await surfaceSettled(page);
    }
    const oblique = await dataset(page);
    timings.approachObliqueMs = Math.round(performance.now() - started);
    await page.screenshot({
      path: `${output}/lunar-oblique-surface-${config.name}.png`,
    });
    for (let step = 0; step < 6; step++) await button(page, "Zoom in").click();
    await surfaceSettled(page);
    const near = await dataset(page);
    assert.ok(
      Number(near.terrainLevel) > Number(far.terrainLevel),
      "Near view must load finer measured geometry",
    );
    assert.ok(
      Number(near.terrainFinestSpacing) < Number(far.terrainFinestSpacing),
      "Near spacing must be finer",
    );
    assert.ok(
      Number(near.terrainSourceSamples) > Number(far.terrainSourceSamples),
      "Near rendered source sample count must increase",
    );
    assert.ok(
      Number(near.terrainClearance) >= 44.9,
      "Camera must remain above conservative measured surface",
    );
    assert.ok(
      Number(near.terrainBytes) <= (config.mobile ? 32 : 64) * 1024 ** 2,
      "Tile memory budget",
    );
    assert.ok(
      Number(near.terrainResident) <= (config.mobile ? 100 : 180),
      "Tile entry budget",
    );
    const activeBefore = await dataset(page);
    started = performance.now();
    await holdFlight(page, "Fly forward", 1800, config.mobile);
    const activeWallMs = performance.now() - started;
    const activeAfter = await dataset(page);
    const travelMeters = Math.hypot(
      Number(activeAfter.terrainPositionX) -
        Number(activeBefore.terrainPositionX),
      Number(activeAfter.terrainPositionZ) -
        Number(activeBefore.terrainPositionZ),
    );
    assert.ok(travelMeters > 1, "Held mouse/touch flight must move the camera");
    assert.ok(
      Number(activeAfter.terrainClearance) >= 44.9,
      "Flight collision clearance",
    );
    await surfaceSettled(page);
    const idleBefore = await dataset(page);
    await page.waitForTimeout(1000);
    const idleAfter = await dataset(page);
    const orbitResources = [await returnToOrbit(page)];
    const cycles = [];
    for (let cycle = 0; cycle < 3; cycle++) {
      started = performance.now();
      await enterSurface(page);
      const surface = await dataset(page);
      const orbit = await returnToOrbit(page);
      cycles.push({
        cycle: cycle + 1,
        roundTripMs: Math.round(performance.now() - started),
        surface,
        orbit,
      });
      orbitResources.push(orbit);
    }
    const warmedGeometries = orbitResources.map((d) => Number(d.geometries));
    const warmedTextures = orbitResources.map((d) => Number(d.textures));
    assert.ok(
      Math.max(...warmedGeometries) - Math.min(...warmedGeometries) <= 1,
      "Orbit geometry allocations must remain stable",
    );
    assert.ok(
      Math.max(...warmedTextures) - Math.min(...warmedTextures) <= 1,
      "Orbit texture allocations must remain stable",
    );
    const destinationCycles = [];
    for (let cycle = 0; cycle < 3; cycle++) {
      await button(page, "Select Saturn").click();
      await page.waitForFunction(() => {
        const d = document.querySelector("canvas")?.dataset;
        return d?.selected === "saturn" && d.cameraSettled === "true";
      });
      const saturn = await dataset(page);
      await button(page, "Select Moon").click();
      await orbitSettled(page);
      destinationCycles.push({ saturn, moon: await dataset(page) });
    }
    const moonTextures = destinationCycles.map((c) => Number(c.moon.textures));
    assert.ok(
      Math.max(...moonTextures) - Math.min(...moonTextures) <= 1,
      "Moon/Saturn shadow targets must not accumulate",
    );
    const heapAfter = await heapMetrics(cdp);
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      scrollX,
      scrollY,
    }));
    assert.equal(layout.scrollHeight, config.viewport.height);
    assert.equal(layout.scrollWidth, config.viewport.width);
    assert.equal(layout.scrollY, 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
    const activeFrames = Number(activeAfter.frame) - Number(activeBefore.frame);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(150);
    const animatedStart = performance.now();
    await button(page, "Approach region").click();
    await page.waitForFunction(
      () => document.querySelector("canvas")?.dataset.cameraSettled === "false",
      null,
      { timeout: 10000 },
    );
    await orbitSettled(page);
    const animatedApproach = {
      milliseconds: Math.round(performance.now() - animatedStart),
      clearance: Number((await dataset(page)).cameraClearance),
      observedInFlight: true,
    };
    assert.ok(
      animatedApproach.clearance >= 0,
      "Animated regional approach stays outside globe",
    );
    await button(page, "Reset camera").click();
    await orbitSettled(page);
    const result = {
      name: config.name,
      url,
      viewport: config.viewport,
      timings,
      animatedApproach,
      globe,
      far,
      oblique,
      near,
      motion: {
        input: config.mobile ? "CDP-emulated touch hold" : "mouse hold",
        activeWallMs: Math.round(activeWallMs),
        activeFrames,
        renderedFramesPerWallSecond: Number(
          (activeFrames / (activeWallMs / 1000)).toFixed(2),
        ),
        travelMeters: Number(travelMeters.toFixed(1)),
        before: activeBefore,
        after: activeAfter,
      },
      idleFramesOverOneSecond:
        Number(idleAfter.frame) - Number(idleBefore.frame),
      cycles,
      orbitAllocations: {
        geometries: warmedGeometries,
        textures: warmedTextures,
      },
      destinationCycles,
      heap: {
        before: heapBefore,
        after: heapAfter,
        method:
          "CDP after explicit garbage collection, not a GPU memory measurement",
      },
      sourceSampleMethod:
        "Active LOD frontier tiles × 65² measured height samples; includes duplicated shared edges and frustum-culled tiles, excludes skirts/reference-sphere context. Actual drawn triangles are recorded separately.",
      layout,
      lunarResponses: responses.length,
      statuses: [...new Set(responses.map((r) => r.status))],
      cancellations: cancellations.length,
      errors,
      failures,
    };
    results.push(result);
    writeFileSync(
      `${output}/lunar-metrics.json`,
      JSON.stringify(
        {
          environment:
            "Chromium with SwiftShader software WebGL; mobile is emulated, no physical-device or native GPU claim",
          generatedAt: new Date().toISOString(),
          results,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      JSON.stringify(
        {
          name: result.name,
          timings,
          far: {
            level: far.terrainLevel,
            spacing: far.terrainFinestSpacing,
            samples: far.terrainSourceSamples,
          },
          near: {
            level: near.terrainLevel,
            spacing: near.terrainFinestSpacing,
            samples: near.terrainSourceSamples,
            bytes: near.terrainBytes,
            resident: near.terrainResident,
            triangles: near.triangles,
          },
          motion: {
            activeFrames,
            activeWallMs: Math.round(activeWallMs),
            travelMeters,
          },
          orbitAllocations: result.orbitAllocations,
          idleFrames: result.idleFramesOverOneSecond,
          errors,
          failures,
        },
        null,
        2,
      ),
    );
    await context.close();
  }
} finally {
  await browser.close();
}
