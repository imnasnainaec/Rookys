import type {
  GameState,
  PieceState,
  PlayerColor,
  Square,
  TurnAction,
} from "../core";

export interface UiBoundary {
  readonly id: "ui-layer";
  readonly description: string;
}

export const uiBoundary: UiBoundary = {
  id: "ui-layer",
  description: "Owns user interactions, rendering, and accessibility flows.",
};

export function formatSquare(
  square: Square,
  fileLabels: readonly string[],
): string {
  return `${fileLabels[square.file]}${square.rank + 1}`;
}

export function describeAction(
  piece: PieceState,
  action: TurnAction,
  capturedPiece: PieceState | undefined,
  fileLabels: readonly string[],
): string {
  if (action.type === "move") {
    const captureSuffix = capturedPiece
      ? `, capturing ${capturedPiece.id}`
      : "";
    return `${piece.id} moved to ${formatSquare(action.to, fileLabels)}${captureSuffix}`;
  }
  return `${piece.id} upgraded ${action.direction}`;
}

export function describeStatus(
  status: GameState["status"],
  labels: Record<PlayerColor, string>,
): string {
  if (status.kind === "check") {
    return `${labels[status.checkedPlayer]} in check`;
  }
  if (status.kind === "checkmate") {
    return `${labels[status.winner]} wins by checkmate`;
  }
  if (status.kind === "stalemate") {
    return status.reason === "repetition"
      ? "Stalemate by repetition"
      : "Stalemate by no legal turn";
  }
  return "Match ongoing";
}
