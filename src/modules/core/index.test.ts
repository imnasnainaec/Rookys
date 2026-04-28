import { describe, expect, it } from "vitest";

import {
  __coreTestOnly,
  applyAction,
  classicVariantParameters,
  coreBoundary,
  createClassicGameState,
  createGameState,
  evaluateTurn,
  generateLegalActions,
  getActionHash,
  getPieceAtSquare,
  getStateHash,
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

  it("does not trigger repetition stalemate unless both recent plies are repeated move actions", () => {
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
            stateMoveHash: "black-new",
            wasRepeat: false,
          },
        ],
      },
    );

    expect(evaluateTurn(state).status).toEqual({ kind: "ongoing" });
  });

  it("rejects actions that are not currently legal", () => {
    const state = createState([
      king("white-king", "white", 2, 0),
      rooky("white-rooky-a", "white", 0, 0),
      king("black-king", "black", 4, 4),
    ]);

    expect(() =>
      applyAction(state, {
        type: "move",
        pieceId: "white-rooky-a",
        to: { file: 0, rank: 1 },
      }),
    ).toThrow("Illegal action.");
  });

  it("prevents actions after terminal states", () => {
    const terminalState = createState(
      [
        king("white-king", "white", 0, 0),
        king("black-king", "black", 2, 2),
        rooky("black-rooky-a", "black", 0, 2, { south: 2 }),
        rooky("black-rooky-b", "black", 2, 0, { west: 2 }),
        rooky("black-rooky-c", "black", 2, 1, { west: 2 }),
      ],
      { activePlayer: "white" },
    );

    expect(terminalState.status).toEqual({
      kind: "checkmate",
      winner: "black",
      loser: "white",
    });

    expect(() =>
      applyAction(terminalState, {
        type: "move",
        pieceId: "white-king",
        to: { file: 1, rank: 0 },
      }),
    ).toThrow("Cannot apply an action to a completed game.");
  });

  it("produces deterministic state hashes regardless of input piece order", () => {
    const orderedPieces = [
      king("white-king", "white", 2, 0),
      rooky("white-rooky-a", "white", 0, 0, { north: 1 }),
      king("black-king", "black", 2, 4),
      rooky("black-rooky-a", "black", 0, 4, { south: 1 }),
    ];

    const reversedPieces = [...orderedPieces].reverse();
    const stateA = createState(orderedPieces, { activePlayer: "white" });
    const stateB = createState(reversedPieces, { activePlayer: "white" });

    expect(getStateHash(stateA)).toBe(getStateHash(stateB));
  });

  it("changes action hash when capture outcome differs", () => {
    const stateWithoutCapture = createState([
      king("white-king", "white", 4, 0),
      rooky("white-rooky-runner", "white", 0, 0, { east: 2 }),
      king("black-king", "black", 4, 4),
    ]);

    const stateWithCapture = createState([
      king("white-king", "white", 4, 0),
      rooky("white-rooky-runner", "white", 0, 0, { east: 2 }),
      rooky("black-rooky-target", "black", 2, 0),
      king("black-king", "black", 4, 4),
    ]);

    const moveAction = {
      type: "move" as const,
      pieceId: "white-rooky-runner",
      to: { file: 2, rank: 0 },
    };

    expect(getActionHash(stateWithoutCapture, moveAction)).not.toBe(
      getActionHash(stateWithCapture, moveAction),
    );
  });

  it("respects variant parameters that disable upgrades", () => {
    const state = createGameState({
      activePlayer: "white",
      variant: {
        ...classicVariantParameters,
        allowUpgradeAction: false,
      },
      pieces: [
        king("white-king", "white", 2, 0),
        rooky("white-rooky-a", "white", 0, 0),
        king("black-king", "black", 2, 4),
      ],
    });

    const legalActions = generateLegalActions(state);

    expect(legalActions.every((action) => action.type === "move")).toBe(true);
  });

  it("exposes defensive helper behavior through test-only internals", () => {
    const board = classicVariantParameters.board;

    expect(() =>
      __coreTestOnly.applyMoveToPieces([], {
        type: "move",
        pieceId: "missing-piece",
        to: { file: 0, rank: 0 },
      }),
    ).toThrow("Unknown piece missing-piece.");

    expect(() =>
      __coreTestOnly.applyUpgradeToPieces(
        board,
        [king("white-king", "white", 2, 0)],
        {
          type: "upgrade",
          pieceId: "white-king",
          direction: "north",
        },
      ),
    ).toThrow("Only rookys can be upgraded.");

    expect(() =>
      __coreTestOnly.applyUpgradeToPieces(
        board,
        [rooky("white-rooky-a", "white", 0, 0, { north: 4 })],
        {
          type: "upgrade",
          pieceId: "white-rooky-a",
          direction: "north",
        },
      ),
    ).toThrow("Upgrade exceeds directional range limit for the board.");

    expect(
      __coreTestOnly.getDirectionBetween(
        { file: 0, rank: 0 },
        { file: 1, rank: 1 },
      ),
    ).toBeNull();

    const pathState = createState([
      king("white-king", "white", 4, 0),
      rooky("white-rooky-blocker", "white", 1, 0),
      king("black-king", "black", 4, 4),
    ]);

    expect(
      __coreTestOnly.isPathClear(
        pathState,
        { file: 0, rank: 0 },
        { file: 1, rank: 1 },
      ),
    ).toBe(false);

    expect(
      __coreTestOnly.isPathClear(
        pathState,
        { file: 0, rank: 0 },
        { file: 2, rank: 0 },
      ),
    ).toBe(false);
  });
});
