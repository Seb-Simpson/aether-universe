import { describe, expect, it } from "vitest";
import { explorerReducer, initialState } from "./explorer-state";
describe("explorer commands", () => {
  it("refocuses the camera after changing subjects without enabling motion", () => {
    const next = explorerReducer(initialState, { type: "select", id: "titan" });
    expect(next.selected).toBe("titan");
    expect(next.command).toEqual({ type: "reset", nonce: 1 });
    expect(next.motion).toBe(false);
  });
  it("distinguishes repeated camera actions so both reach the renderer", () => {
    const first = explorerReducer(initialState, {
      type: "camera",
      command: "zoom-in",
    });
    const second = explorerReducer(first, {
      type: "camera",
      command: "zoom-in",
    });
    expect(second.command?.nonce).toBe(2);
  });
  it("preserves selection and camera when pausing motion", () => {
    const next = explorerReducer(
      { ...initialState, selected: "rhea", motion: true },
      { type: "motion", enabled: false },
    );
    expect(next.selected).toBe("rhea");
    expect(next.motion).toBe(false);
    expect(next.command).toBeNull();
  });
});
