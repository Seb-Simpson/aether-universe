import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL:
      process.env.AETHER_TEST_URL ?? "http://127.0.0.1:3000/aether-universe/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      args: [
        "--enable-webgl",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 412, height: 915 },
        // Keep software WebGL practical in CI; CSS viewport and touch are mobile.
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: process.env.AETHER_TEST_URL
    ? undefined
    : {
        command: "npm run start",
        url: "http://127.0.0.1:3000/aether-universe/",
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
