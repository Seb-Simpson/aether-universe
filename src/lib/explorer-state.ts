import type { BodyId } from "@/data/bodies";
export type CameraAction = "zoom-in" | "zoom-out" | "reset" | "top" | "angle";
export interface ExplorerState {
  selected: BodyId;
  motion: boolean;
  command: { type: CameraAction; nonce: number } | null;
}
export type ExplorerAction =
  | { type: "select"; id: BodyId }
  | { type: "motion"; enabled: boolean }
  | { type: "camera"; command: CameraAction };
export const initialState: ExplorerState = {
  selected: "saturn",
  motion: false,
  command: null,
};
export function explorerReducer(
  state: ExplorerState,
  action: ExplorerAction,
): ExplorerState {
  switch (action.type) {
    case "select":
      return {
        ...state,
        selected: action.id,
        command: { type: "reset", nonce: (state.command?.nonce ?? 0) + 1 },
      };
    case "motion":
      return { ...state, motion: action.enabled };
    case "camera":
      return {
        ...state,
        command: {
          type: action.command,
          nonce: (state.command?.nonce ?? 0) + 1,
        },
      };
  }
}
