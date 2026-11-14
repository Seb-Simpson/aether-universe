import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BASE_PATH, assetPath } from "./paths";
describe("Pages asset paths", () => {
  it("mounts programmatic public assets below the project path", () => {
    expect(assetPath("/textures/saturn.jpg")).toBe(
      `${BASE_PATH}/textures/saturn.jpg`,
    );
    expect(assetPath("textures/saturn-ring.png")).toBe(
      `${BASE_PATH}/textures/saturn-ring.png`,
    );
  });
  it("keeps CSS public URLs below the same mount", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const urls = [...css.matchAll(/url\("(\/[^\"]+)"\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url.startsWith(`${BASE_PATH}/`)).toBe(true);
  });
});
