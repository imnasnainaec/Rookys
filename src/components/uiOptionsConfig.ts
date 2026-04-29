import type { PlayerColor } from "../modules/core";

export type PlayerPaletteId =
  | "black-white"
  | "yellow-red"
  | "red-blue"
  | "yellow-blue";
export type FileLabelSetId = "alpha" | "qwert" | "home" | "bottom";

export type PlayerPaletteOption = {
  readonly id: PlayerPaletteId;
  readonly label: string;
  readonly labels: Record<PlayerColor, string>;
};

export type FileLabelOption = {
  readonly id: FileLabelSetId;
  readonly label: string;
  readonly labels: readonly string[];
};

export const playerPaletteOptions: readonly PlayerPaletteOption[] = [
  {
    id: "black-white",
    label: "Black vs White",
    labels: { white: "White", black: "Black" },
  },
  {
    id: "yellow-red",
    label: "Yellow vs Red",
    labels: { white: "Yellow", black: "Red" },
  },
  {
    id: "red-blue",
    label: "Red vs Blue",
    labels: { white: "Red", black: "Blue" },
  },
  {
    id: "yellow-blue",
    label: "Yellow vs Blue",
    labels: { white: "Yellow", black: "Blue" },
  },
] as const;

export const fileLabelOptions: readonly FileLabelOption[] = [
  { id: "alpha", label: "a, b, c, d, e", labels: ["a", "b", "c", "d", "e"] },
  { id: "qwert", label: "q, w, e, r, t", labels: ["q", "w", "e", "r", "t"] },
  { id: "home", label: "a, s, d, f, g", labels: ["a", "s", "d", "f", "g"] },
  { id: "bottom", label: "z, x, c, v, b", labels: ["z", "x", "c", "v", "b"] },
] as const;
