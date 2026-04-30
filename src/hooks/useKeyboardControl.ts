import { useState } from "react";

import {
  getPieceAtSquare,
  type GameState,
  type PieceState,
  type TurnAction,
} from "../modules/core";

interface KeyboardAction {
  readonly action: TurnAction;
  readonly label: string;
}

interface UseKeyboardControlOptions {
  readonly gameState: GameState;
  readonly fileLabels: readonly string[];
  readonly keyboardActions: readonly KeyboardAction[];
  readonly selectedPieceId: string | null;
  readonly onSelectPiece: (piece: PieceState) => void;
  readonly onCommitAction: (action: TurnAction) => void;
  readonly onResetSelection: () => void;
}

interface UseKeyboardControlReturn {
  readonly coordinateBuffer: string;
  readonly activeKeyboardActionIndex: number;
  readonly activeKeyboardAction: TurnAction | null;
  readonly resetActiveIndex: () => void;
  readonly clearCoordinateBuffer: () => void;
  readonly handleKeyboardActionKeyDown: (
    event: React.KeyboardEvent<HTMLElement>,
  ) => void;
}

export function useKeyboardControl({
  gameState,
  fileLabels,
  keyboardActions,
  selectedPieceId,
  onSelectPiece,
  onCommitAction,
  onResetSelection,
}: UseKeyboardControlOptions): UseKeyboardControlReturn {
  const [coordinateBuffer, setCoordinateBuffer] = useState("");
  const [activeKeyboardActionIndex, setActiveKeyboardActionIndex] = useState(0);

  const normalizedIndex =
    keyboardActions.length === 0
      ? 0
      : activeKeyboardActionIndex % keyboardActions.length;
  const activeKeyboardAction =
    keyboardActions.length === 0
      ? null
      : keyboardActions[normalizedIndex].action;

  function resetActiveIndex() {
    setActiveKeyboardActionIndex(0);
  }

  function clearCoordinateBuffer() {
    setCoordinateBuffer("");
  }

  function tryParseCoordinateAndSelect(buffer: string): boolean {
    if (buffer.length < 2) {
      return false;
    }

    const fileChar = buffer.charAt(0);
    const rankChar = buffer.charAt(1);
    const altFileChar = buffer.charAt(1);
    const altRankChar = buffer.charAt(0);

    // Try file-rank order
    const fileIndex = fileLabels.findIndex(
      (label) => label.toLowerCase() === fileChar.toLowerCase(),
    );
    const rankIndex = Number.parseInt(rankChar, 10) - 1;

    if (
      fileIndex >= 0 &&
      rankIndex >= 0 &&
      rankIndex < gameState.variant.board.height
    ) {
      const square = { file: fileIndex, rank: rankIndex };
      const occupant = getPieceAtSquare(gameState, square);
      if (occupant && occupant.owner === gameState.turn.activePlayer) {
        onSelectPiece(occupant);
        setCoordinateBuffer("");
        return true;
      }
    }

    // Try rank-file order
    const altRankIndex = Number.parseInt(altRankChar, 10) - 1;
    const altFileIndex = fileLabels.findIndex(
      (label) => label.toLowerCase() === altFileChar.toLowerCase(),
    );

    if (
      altFileIndex >= 0 &&
      altRankIndex >= 0 &&
      altRankIndex < gameState.variant.board.height
    ) {
      const square = { file: altFileIndex, rank: altRankIndex };
      const occupant = getPieceAtSquare(gameState, square);
      if (occupant && occupant.owner === gameState.turn.activePlayer) {
        onSelectPiece(occupant);
        setCoordinateBuffer("");
        return true;
      }
    }

    return false;
  }

  function handleKeyboardActionKeyDown(
    event: React.KeyboardEvent<HTMLElement>,
  ) {
    const fileLabelsLower = fileLabels.map((label) => label.toLowerCase());
    const isFileChar = fileLabelsLower.includes(event.key.toLowerCase());
    const isRankChar = /^[1-9]$/.test(event.key);

    if (isFileChar || isRankChar) {
      event.preventDefault();
      const newBuffer = coordinateBuffer + event.key.toLowerCase();
      setCoordinateBuffer(newBuffer);
      tryParseCoordinateAndSelect(newBuffer);
      return;
    }

    if (
      keyboardActions.length === 0 &&
      selectedPieceId === null &&
      event.key !== "Escape"
    ) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setCoordinateBuffer("");
      onResetSelection();
      return;
    }

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      setActiveKeyboardActionIndex(
        (previous) => (previous + 1) % keyboardActions.length,
      );
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveKeyboardActionIndex(
        (previous) =>
          (previous - 1 + keyboardActions.length) % keyboardActions.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      onCommitAction(keyboardActions[normalizedIndex].action);
      setCoordinateBuffer("");
    }
  }

  return {
    coordinateBuffer,
    activeKeyboardActionIndex,
    activeKeyboardAction,
    resetActiveIndex,
    clearCoordinateBuffer,
    handleKeyboardActionKeyDown,
  };
}
