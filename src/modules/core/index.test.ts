import { describe, expect, it } from "vitest";

import {
  applyAction,
  coreBoundary,
  createClassicGameState,
  createGameState,
  evaluateTurn,
  generateLegalActions,
  getPieceAtSquare,
  type DirectionalRanges,
  type GameState,
  type KingState,
  type PieceState,
  type RepetitionPly,
  type RookyState,
} from "./index";

const emptyRanges: DirectionalRanges = {
  north: 0,
  south: 0,
  east: 0,
  west: 0,
};

function king(
  id: string,
  owner: "white" | "black",
  file: number,
  rank: number,
): KingState {
  return {
    id,
    kind: "king",
    owner,
    square: { file, rank },
  };
}

function rooky(
  id: string,
  owner: "white" | "black",
  file: number,
  rank: number,
  ranges: Partial<DirectionalRanges> = {},
): RookyState {
  return {
    id,
    kind: "rooky",
    owner,
    square: { file, rank },
    ranges: {
      ...emptyRanges,
      ...ranges,
    },
  };
}

function createState(
  pieces: readonly PieceState[],
  options?: {
    activePlayer?: "white" | "black";
    recentPlies?: readonly RepetitionPly[];
    seenHashes?: GameState["repetition"]["seenStateMoveHashes"];
  },
): GameState {
  return createGameState({
    pieces,
    activePlayer: options?.activePlayer,
    repetition: {
      recentPlies: options?.recentPlies,
      seenStateMoveHashes: options?.seenHashes,
    },
  });
}

describe("core engine", () => {
  it("exposes stable core engine metadata", () => {
    expect(coreBoundary.id).toBe("core-engine");
    expect(coreBoundary.description.length).toBeGreaterThan(0);
  });

  it("creates the classic 5x5 starting position", () => {
    const state = createClassicGameState();

    expect(state.variant.board).toEqual({ width: 5, height: 5 });
    expect(state.turn.activePlayer).toBe("white");
    expect(state.pieces).toHaveLength(10);
    expect(getPieceAtSquare(state, { file: 2, rank: 0 })).toMatchObject({
      id: "white-king",
      kind: "king",
    });
    expect(getPieceAtSquare(state, { file: 2, rank: 4 })).toMatchObject({
      id: "black-king",
      kind: "king",
    });
    expect(state.status).toEqual({ kind: "ongoing" });
  });

  it("generates only king moves and rooky upgrades from the initial position", () => {
    const legalActions = generateLegalActions(createClassicGameState());
    const moveActions = legalActions.filter((action) => action.type === "move");
    const upgradeActions = legalActions.filter(
      (action) => action.type === "upgrade",
    );

    expect(moveActions).toHaveLength(3);
    expect(upgradeActions).toHaveLength(16);
    expect(
      moveActions.every((action) => action.pieceId === "white-king"),
    ).toBeTruthy();
  });

  it("enforces rooky range, blocking, and capture rules", () => {
    const state = createState([
      king("white-king", "white", 4, 0),
      rooky("white-rooky-runner", "white", 0, 0, { east: 4 }),
      rooky("white-rooky-blocker", "white", 1, 0),
      king("black-king", "black", 4, 4),
    ]);

    const blockedMoves = generateLegalActions(state).filter(
      (action) =>
        action.type === "move" && action.pieceId === "white-rooky-runner",
    );

    expect(blockedMoves).toHaveLength(0);

    const captureState = createState([
      king("white-king", "white", 4, 0),
      rooky("white-rooky-runner", "white", 0, 0, { east: 4 }),
      rooky("black-rooky-target", "black", 2, 0),
      king("black-king", "black", 4, 4),
    ]);

    const captureAction = generateLegalActions(captureState).find(
      (action) =>
        action.type === "move" &&
        action.pieceId === "white-rooky-runner" &&
        action.to.file === 2 &&
        action.to.rank === 0,
    );

    expect(captureAction).toBeDefined();

    const nextState = applyAction(captureState, captureAction!);

    expect(getPieceAtSquare(nextState, { file: 2, rank: 0 })).toMatchObject({
      id: "white-rooky-runner",
    });
    expect(
      nextState.pieces.some((piece) => piece.id === "black-rooky-target"),
    ).toBe(false);
  });

  it("filters out actions that leave the active king in check", () => {
    const state = createState([
      king("white-king", "white", 2, 0),
      rooky("white-rooky-a", "white", 0, 0),
      king("black-king", "black", 4, 4),
      rooky("black-rooky-c", "black", 2, 4, { south: 4 }),
    ]);

    const evaluation = evaluateTurn(state);

    expect(evaluation.inCheck).toBe(true);
    expect(evaluation.status).toEqual({
      kind: "check",
      checkedPlayer: "white",
    });
    expect(
      evaluation.legalActions.some((action) => action.type === "upgrade"),
    ).toBeFalsy();
    expect(evaluation.legalActions).toHaveLength(4);
  });

  it("applies upgrades and clears repetition tracking", () => {
    const state = createState(
      [
        king("white-king", "white", 4, 0),
        rooky("white-rooky-a", "white", 0, 0),
        king("black-king", "black", 4, 4),
      ],
      {
        seenHashes: {
          white: ["white-repeat"],
          black: ["black-repeat"],
        },
      },
    );

    const nextState = applyAction(state, {
      type: "upgrade",
      pieceId: "white-rooky-a",
      direction: "north",
    });

    expect(getPieceAtSquare(nextState, { file: 0, rank: 0 })).toMatchObject({
      kind: "rooky",
      ranges: expect.objectContaining({ north: 1 }),
    });
    expect(nextState.repetition).toEqual({
      seenStateMoveHashes: { white: [], black: [] },
      recentPlies: [],
    });
    expect(nextState.turn.activePlayer).toBe("black");
  });

  it("blocks over-upgrading beyond board directional limits", () => {
    const state = createState([
      king("white-king", "white", 4, 0),
      rooky("white-rooky-a", "white", 0, 0, {
        north: 4,
        east: 4,
      }),
      king("black-king", "black", 4, 4),
    ]);

    const legalActions = generateLegalActions(state);
    const northUpgrade = legalActions.find(
      (action) =>
        action.type === "upgrade" &&
        action.pieceId === "white-rooky-a" &&
        action.direction === "north",
    );
    const eastUpgrade = legalActions.find(
      (action) =>
        action.type === "upgrade" &&
        action.pieceId === "white-rooky-a" &&
        action.direction === "east",
    );

    expect(northUpgrade).toBeUndefined();
    expect(eastUpgrade).toBeUndefined();

    expect(() =>
      applyAction(state, {
        type: "upgrade",
        pieceId: "white-rooky-a",
        direction: "north",
      }),
    ).toThrow("Illegal action.");
  });

  it("detects checkmate and stalemate evaluation states", () => {
    const checkmateState = createState(
      [
        king("white-king", "white", 0, 0),
        king("black-king", "black", 2, 2),
        rooky("black-rooky-a", "black", 0, 2, { south: 2 }),
        rooky("black-rooky-b", "black", 2, 0, { west: 2 }),
        rooky("black-rooky-c", "black", 2, 1, { west: 2 }),
      ],
      { activePlayer: "white" },
    );

    expect(evaluateTurn(checkmateState).status).toEqual({
      kind: "checkmate",
      winner: "black",
      loser: "white",
    });

    const stalemateState = createState(
      [
        king("white-king", "white", 0, 0),
        king("black-king", "black", 2, 1),
        rooky("black-rooky-a", "black", 0, 2, { south: 1 }),
      ],
      { activePlayer: "white" },
    );

    expect(evaluateTurn(stalemateState).status).toEqual({
      kind: "stalemate",
      reason: "no-legal-turn",
    });
  });

  it("detects the repeated state-move stalemate condition", () => {
    const state = createState(
      [king("white-king", "white", 0, 0), king("black-king", "black", 4, 4)],
      {
        activePlayer: "white",
        recentPlies: [
          {
            player: "white",
            actionType: "move",
            stateMoveHash: "white-repeat",
            wasRepeat: true,
          },
          {
            player: "black",
            actionType: "move",
            stateMoveHash: "black-repeat",
            wasRepeat: true,
          },
        ],
      },
    );

    expect(evaluateTurn(state).status).toEqual({
      kind: "stalemate",
      reason: "repetition",
    });
  });
});
