export type PieceKind = "king" | "rooky";

export interface EngineModuleBoundary {
  readonly id: "core-engine";
  readonly description: string;
}

export const coreBoundary: EngineModuleBoundary = {
  id: "core-engine",
  description:
    "Owns board state schema, legal move generation, and terminal checks.",
};
