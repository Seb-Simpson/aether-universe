import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { BASE_PATH } from "@/lib/paths";
import { bodies, bodyOrder } from "./bodies";

describe("editorial astronomy data integrity", () => {
  it("has one unique record for every selectable subject", () => {
    expect(new Set(bodyOrder).size).toBe(5);
    expect(Object.keys(bodies).sort()).toEqual([...bodyOrder].sort());
    for (const id of bodyOrder) expect(bodies[id].id).toBe(id);
  });
  it("resolves every displayed fact to an authoritative source", () => {
    for (const body of Object.values(bodies)) {
      expect(body.facts.length).toBeGreaterThanOrEqual(4);
      for (const fact of body.facts) {
        const source = body.sources.find((item) => item.id === fact.source);
        expect(source, `${body.name}: ${fact.label}`).toBeDefined();
        expect(new URL(source!.url).hostname).toBe("science.nasa.gov");
        expect(fact.value.trim()).not.toBe("");
      }
    }
  });
  it("bundles every referenced surface texture locally", () => {
    for (const body of Object.values(bodies)) {
      expect(body.texture).toMatch(
        /^\/aether-universe\/(?:textures|lunar)\/[a-z-]+\.jpg$/,
      );
      expect(
        existsSync(
          path.join(
            process.cwd(),
            "public",
            body.texture.slice(BASE_PATH.length),
          ),
        ),
      ).toBe(true);
    }
  });
});
