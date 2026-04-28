export type PieceKind = "king" | "rooky";
export type PlayerColor = "white" | "black";
export type Direction = "north" | "south" | "east" | "west";

export interface EngineModuleBoundary {
  readonly id: "core-engine";
  readonly description: string;
}

export interface Square {
  readonly file: number;
  readonly rank: number;
}

export interface BoardState {
  readonly width: number;
  readonly height: number;
}

export interface DirectionalRanges {
  readonly north: number;
  readonly south: number;
  readonly east: number;
  readonly west: number;
}

interface BasePieceState {
  readonly id: string;
  readonly owner: PlayerColor;
  readonly square: Square;
}

export interface KingState extends BasePieceState {
  readonly kind: "king";
}

export interface RookyState extends BasePieceState {
  readonly kind: "rooky";
  readonly ranges: DirectionalRanges;
}

export type PieceState = KingState | RookyState;

export interface VariantParameters {
  readonly id: string;
  readonly label: string;
  readonly board: BoardState;
  readonly allowUpgradeAction: boolean;
  readonly allowPassAction: boolean;
  readonly rookyDirections: readonly Direction[];
}

export interface MoveAction {
  readonly type: "move";
  readonly pieceId: string;
  readonly to: Square;
}

export interface UpgradeAction {
  readonly type: "upgrade";
  readonly pieceId: string;
  readonly direction: Direction;
}

export type TurnAction = MoveAction | UpgradeAction;

export interface TurnMetadata {
  readonly activePlayer: PlayerColor;
  readonly ply: number;
  readonly lastAction: TurnAction | null;
}

export interface RepetitionPly {
  readonly player: PlayerColor;
  readonly actionType: TurnAction["type"];
  readonly stateMoveHash: string;
  readonly wasRepeat: boolean;
}

export interface RepetitionCache {
  readonly seenStateMoveHashes: Readonly<
    Record<PlayerColor, readonly string[]>
  >;
  readonly recentPlies: readonly RepetitionPly[];
}

export type GameStatus =
  | { readonly kind: "ongoing" }
  | { readonly kind: "check"; readonly checkedPlayer: PlayerColor }
  | {
      readonly kind: "checkmate";
      readonly winner: PlayerColor;
      readonly loser: PlayerColor;
    }
  | {
      readonly kind: "stalemate";
      readonly reason: "no-legal-turn" | "repetition";
    };

export interface GameState {
  readonly variant: VariantParameters;
  readonly pieces: readonly PieceState[];
  readonly turn: TurnMetadata;
  readonly repetition: RepetitionCache;
  readonly status: GameStatus;
}

export interface TurnEvaluation {
  readonly activePlayer: PlayerColor;
  readonly inCheck: boolean;
  readonly legalActions: readonly TurnAction[];
  readonly status: GameStatus;
}

export interface CreateGameStateInput {
  readonly pieces: readonly PieceState[];
  readonly activePlayer?: PlayerColor;
  readonly ply?: number;
  readonly lastAction?: TurnAction | null;
  readonly repetition?: Partial<RepetitionCache>;
  readonly variant?: VariantParameters;
}

const CLASSIC_BOARD: BoardState = {
  width: 5,
  height: 5,
};

const EMPTY_RANGES: DirectionalRanges = {
  north: 0,
  south: 0,
  east: 0,
  west: 0,
};

const DIRECTION_VECTORS: Record<Direction, Square> = {
  north: { file: 0, rank: 1 },
  south: { file: 0, rank: -1 },
  east: { file: 1, rank: 0 },
  west: { file: -1, rank: 0 },
};

const FILE_LABELS = ["a", "b", "c", "d", "e"] as const;

export const classicVariantParameters: VariantParameters = {
  id: "classic",
  label: "Classic",
  board: CLASSIC_BOARD,
  allowUpgradeAction: true,
  allowPassAction: false,
  rookyDirections: ["north", "south", "east", "west"],
};

export const coreBoundary: EngineModuleBoundary = {
  id: "core-engine",
  description:
    "Owns board state schema, legal move generation, upgrade semantics, and terminal checks.",
};

export function createClassicGameState(): GameState {
  const pieces: PieceState[] = [];

  for (const owner of ["white", "black"] as const) {
    const homeRank = owner === "white" ? 0 : CLASSIC_BOARD.height - 1;

    pieces.push({
      id: `${owner}-king`,
      kind: "king",
      owner,
      square: { file: 2, rank: homeRank },
    });

    for (let file = 0; file < CLASSIC_BOARD.width; file += 1) {
      if (file === 2) {
        continue;
      }

      pieces.push({
        id: `${owner}-rooky-${FILE_LABELS[file]}`,
        kind: "rooky",
        owner,
        square: { file, rank: homeRank },
        ranges: EMPTY_RANGES,
      });
    }
  }

  return createGameState({ pieces, activePlayer: "white", ply: 1 });
}

export function createGameState(input: CreateGameStateInput): GameState {
  const base: GameState = {
    variant: input.variant ?? classicVariantParameters,
    pieces: sortPieces(input.pieces),
    turn: {
      activePlayer: input.activePlayer ?? "white",
      ply: input.ply ?? 1,
      lastAction: input.lastAction ?? null,
    },
    repetition: {
      seenStateMoveHashes: {
        white: [...(input.repetition?.seenStateMoveHashes?.white ?? [])],
        black: [...(input.repetition?.seenStateMoveHashes?.black ?? [])],
      },
      recentPlies: [...(input.repetition?.recentPlies ?? [])].slice(-2),
    },
    status: { kind: "ongoing" },
  };

  return {
    ...base,
    status: deriveStatus(base),
  };
}

export function evaluateTurn(state: GameState): TurnEvaluation {
  const legalActions = generateLegalActions(state);
  const inCheck = isKingInCheck(state, state.turn.activePlayer);

  return {
    activePlayer: state.turn.activePlayer,
    inCheck,
    legalActions,
    status: deriveStatus(state, legalActions, inCheck),
  };
}

export function generateLegalActions(state: GameState): readonly TurnAction[] {
  const activePieces = sortPieces(
    state.pieces.filter((piece) => piece.owner === state.turn.activePlayer),
  );
  const legalActions: TurnAction[] = [];

  for (const piece of activePieces) {
    legalActions.push(...generateLegalMoveActions(state, piece));

    if (piece.kind === "rooky" && state.variant.allowUpgradeAction) {
      legalActions.push(...generateLegalUpgradeActions(state, piece));
    }
  }

  return legalActions;
}

export function applyAction(state: GameState, action: TurnAction): GameState {
  if (state.status.kind === "checkmate" || state.status.kind === "stalemate") {
    throw new Error("Cannot apply an action to a completed game.");
  }

  const legalAction = generateLegalActions(state).find(
    (candidate) =>
      getActionHash(state, candidate) === getActionHash(state, action),
  );

  if (!legalAction) {
    throw new Error("Illegal action.");
  }

  const nextPieces =
    legalAction.type === "move"
      ? applyMoveToPieces(state.pieces, legalAction)
      : applyUpgradeToPieces(state.variant.board, state.pieces, legalAction);

  const nextRepetition =
    legalAction.type === "move"
      ? recordMoveRepetition(state, legalAction)
      : createEmptyRepetitionCache();

  const nextState: GameState = {
    variant: state.variant,
    pieces: sortPieces(nextPieces),
    turn: {
      activePlayer: getOpponent(state.turn.activePlayer),
      ply: state.turn.ply + 1,
      lastAction: legalAction,
    },
    repetition: nextRepetition,
    status: { kind: "ongoing" },
  };

  return {
    ...nextState,
    status: deriveStatus(nextState),
  };
}

export function isKingInCheck(state: GameState, player: PlayerColor): boolean {
  const king = state.pieces.find(
    (piece): piece is KingState =>
      piece.owner === player && piece.kind === "king",
  );

  if (!king) {
    return false;
  }

  return (
    getThreateningPieces(state, king.square, getOpponent(player)).length > 0
  );
}

export function getThreateningPieces(
  state: GameState,
  target: Square,
  attacker: PlayerColor,
): readonly PieceState[] {
  return state.pieces.filter(
    (piece) =>
      piece.owner === attacker && canPieceAttackSquare(state, piece, target),
  );
}

export function getPieceAtSquare(
  state: Pick<GameState, "pieces">,
  square: Square,
): PieceState | undefined {
  return state.pieces.find((piece) => areSquaresEqual(piece.square, square));
}

export function getStateHash(state: GameState): string {
  const pieceHash = sortPieces(state.pieces)
    .map((piece) => {
      if (piece.kind === "king") {
        return [
          piece.id,
          piece.owner,
          piece.kind,
          serializeSquare(piece.square),
        ].join("|");
      }

      return [
        piece.id,
        piece.owner,
        piece.kind,
        serializeSquare(piece.square),
        piece.ranges.north,
        piece.ranges.south,
        piece.ranges.east,
        piece.ranges.west,
      ].join("|");
    })
    .join(";");

  return [
    `variant:${state.variant.id}`,
    `board:${state.variant.board.width}x${state.variant.board.height}`,
    `active:${state.turn.activePlayer}`,
    `pieces:${pieceHash}`,
  ].join("||");
}

export function getActionHash(state: GameState, action: TurnAction): string {
  const piece = state.pieces.find(
    (candidate) => candidate.id === action.pieceId,
  );

  if (!piece) {
    throw new Error(`Unknown piece ${action.pieceId}.`);
  }

  if (action.type === "move") {
    const capturedPiece = getPieceAtSquare(state, action.to);

    return [
      "move",
      piece.id,
      serializeSquare(piece.square),
      serializeSquare(action.to),
      capturedPiece?.id ?? "none",
    ].join("|");
  }

  if (piece.kind !== "rooky") {
    throw new Error("Only rookys can be upgraded.");
  }

  return [
    "upgrade",
    piece.id,
    action.direction,
    piece.ranges[action.direction],
    piece.ranges[action.direction] + 1,
  ].join("|");
}

export function getStateMoveHash(state: GameState, action: TurnAction): string {
  return `${getStateHash(state)}||${getActionHash(state, action)}`;
}

function deriveStatus(
  state: GameState,
  legalActions = generateLegalActions(state),
  inCheck = isKingInCheck(state, state.turn.activePlayer),
): GameStatus {
  if (hasRepeatedTwoPlyCycle(state)) {
    return {
      kind: "stalemate",
      reason: "repetition",
    };
  }

  if (legalActions.length === 0) {
    if (inCheck) {
      return {
        kind: "checkmate",
        winner: getOpponent(state.turn.activePlayer),
        loser: state.turn.activePlayer,
      };
    }

    return {
      kind: "stalemate",
      reason: "no-legal-turn",
    };
  }

  if (inCheck) {
    return {
      kind: "check",
      checkedPlayer: state.turn.activePlayer,
    };
  }

  return { kind: "ongoing" };
}

function hasRepeatedTwoPlyCycle(state: GameState): boolean {
  const [first, second] = state.repetition.recentPlies;

  if (!first || !second) {
    return false;
  }

  return (
    first.actionType === "move" &&
    second.actionType === "move" &&
    first.player !== second.player &&
    first.wasRepeat &&
    second.wasRepeat
  );
}

function generateLegalMoveActions(
  state: GameState,
  piece: PieceState,
): readonly MoveAction[] {
  const candidates =
    piece.kind === "king"
      ? getKingMoveCandidates(state, piece)
      : getRookyMoveCandidates(state, piece);

  return candidates.filter(
    (candidate) =>
      !wouldLeaveKingInCheckAfterMove(state, piece.owner, candidate),
  );
}

function generateLegalUpgradeActions(
  state: GameState,
  piece: RookyState,
): readonly UpgradeAction[] {
  return state.variant.rookyDirections
    .map(
      (direction): UpgradeAction => ({
        type: "upgrade",
        pieceId: piece.id,
        direction,
      }),
    )
    .filter(
      (candidate) =>
        canApplyUpgrade(state.variant.board, piece, candidate.direction) &&
        !isKingInCheck(
          {
            ...state,
            pieces: applyUpgradeToPieces(
              state.variant.board,
              state.pieces,
              candidate,
            ),
          },
          piece.owner,
        ),
    );
}

function getKingMoveCandidates(
  state: GameState,
  piece: KingState,
): readonly MoveAction[] {
  const candidates: MoveAction[] = [];

  for (let fileOffset = -1; fileOffset <= 1; fileOffset += 1) {
    for (let rankOffset = -1; rankOffset <= 1; rankOffset += 1) {
      if (fileOffset === 0 && rankOffset === 0) {
        continue;
      }

      const destination = {
        file: piece.square.file + fileOffset,
        rank: piece.square.rank + rankOffset,
      };

      if (!isOnBoard(state.variant.board, destination)) {
        continue;
      }

      const occupant = getPieceAtSquare(state, destination);

      if (occupant?.owner === piece.owner) {
        continue;
      }

      candidates.push({
        type: "move",
        pieceId: piece.id,
        to: destination,
      });
    }
  }

  return candidates;
}

function getRookyMoveCandidates(
  state: GameState,
  piece: RookyState,
): readonly MoveAction[] {
  const candidates: MoveAction[] = [];

  for (const direction of state.variant.rookyDirections) {
    const range = piece.ranges[direction];

    for (let step = 1; step <= range; step += 1) {
      const destination = translateSquare(
        piece.square,
        DIRECTION_VECTORS[direction],
        step,
      );

      if (!isOnBoard(state.variant.board, destination)) {
        break;
      }

      const occupant = getPieceAtSquare(state, destination);

      if (occupant?.owner === piece.owner) {
        break;
      }

      candidates.push({
        type: "move",
        pieceId: piece.id,
        to: destination,
      });

      if (occupant) {
        break;
      }
    }
  }

  return candidates;
}

function wouldLeaveKingInCheckAfterMove(
  state: GameState,
  player: PlayerColor,
  action: MoveAction,
): boolean {
  return isKingInCheck(
    {
      ...state,
      pieces: applyMoveToPieces(state.pieces, action),
    },
    player,
  );
}

function canPieceAttackSquare(
  state: GameState,
  piece: PieceState,
  target: Square,
): boolean {
  if (piece.kind === "king") {
    return (
      Math.abs(piece.square.file - target.file) <= 1 &&
      Math.abs(piece.square.rank - target.rank) <= 1 &&
      !areSquaresEqual(piece.square, target)
    );
  }

  if (piece.square.file !== target.file && piece.square.rank !== target.rank) {
    return false;
  }

  const direction = getDirectionBetween(piece.square, target);

  if (!direction) {
    return false;
  }

  const distance = getOrthogonalDistance(piece.square, target);

  if (distance > piece.ranges[direction]) {
    return false;
  }

  return isPathClear(state, piece.square, target);
}

function applyMoveToPieces(
  pieces: readonly PieceState[],
  action: MoveAction,
): readonly PieceState[] {
  const movingPiece = pieces.find((piece) => piece.id === action.pieceId);

  if (!movingPiece) {
    throw new Error(`Unknown piece ${action.pieceId}.`);
  }

  return pieces
    .filter(
      (piece) =>
        piece.id !== getPieceIdAtSquare(pieces, action.to) ||
        piece.id === movingPiece.id,
    )
    .map((piece) => {
      if (piece.id !== movingPiece.id) {
        return piece;
      }

      return {
        ...piece,
        square: action.to,
      };
    });
}

function applyUpgradeToPieces(
  board: BoardState,
  pieces: readonly PieceState[],
  action: UpgradeAction,
): readonly PieceState[] {
  return pieces.map((piece) => {
    if (piece.id !== action.pieceId) {
      return piece;
    }

    if (piece.kind !== "rooky") {
      throw new Error("Only rookys can be upgraded.");
    }

    if (!canApplyUpgrade(board, piece, action.direction)) {
      throw new Error("Upgrade exceeds directional range limit for the board.");
    }

    return {
      ...piece,
      ranges: {
        ...piece.ranges,
        [action.direction]: piece.ranges[action.direction] + 1,
      },
    };
  });
}

function recordMoveRepetition(
  state: GameState,
  action: MoveAction,
): RepetitionCache {
  const stateMoveHash = getStateMoveHash(state, action);
  const currentHashes =
    state.repetition.seenStateMoveHashes[state.turn.activePlayer];
  const wasRepeat = currentHashes.includes(stateMoveHash);
  const nextPly: RepetitionPly = {
    player: state.turn.activePlayer,
    actionType: "move",
    stateMoveHash,
    wasRepeat,
  };

  return {
    seenStateMoveHashes: {
      ...state.repetition.seenStateMoveHashes,
      [state.turn.activePlayer]: [...currentHashes, stateMoveHash],
    },
    recentPlies: [...state.repetition.recentPlies, nextPly].slice(-2),
  };
}

function createEmptyRepetitionCache(): RepetitionCache {
  return {
    seenStateMoveHashes: {
      white: [],
      black: [],
    },
    recentPlies: [],
  };
}

function getPieceIdAtSquare(
  pieces: readonly PieceState[],
  square: Square,
): string | undefined {
  return pieces.find((piece) => areSquaresEqual(piece.square, square))?.id;
}

function getDirectionBetween(from: Square, to: Square): Direction | null {
  if (from.file === to.file) {
    return to.rank > from.rank ? "north" : "south";
  }

  if (from.rank === to.rank) {
    return to.file > from.file ? "east" : "west";
  }

  return null;
}

function getOrthogonalDistance(from: Square, to: Square): number {
  return Math.abs(from.file - to.file) + Math.abs(from.rank - to.rank);
}

function isPathClear(state: GameState, from: Square, to: Square): boolean {
  const direction = getDirectionBetween(from, to);

  if (!direction) {
    return false;
  }

  const distance = getOrthogonalDistance(from, to);

  for (let step = 1; step < distance; step += 1) {
    const intermediate = translateSquare(
      from,
      DIRECTION_VECTORS[direction],
      step,
    );

    if (getPieceAtSquare(state, intermediate)) {
      return false;
    }
  }

  return true;
}

function translateSquare(
  origin: Square,
  vector: Square,
  magnitude: number,
): Square {
  return {
    file: origin.file + vector.file * magnitude,
    rank: origin.rank + vector.rank * magnitude,
  };
}

function isOnBoard(board: BoardState, square: Square): boolean {
  return (
    square.file >= 0 &&
    square.file < board.width &&
    square.rank >= 0 &&
    square.rank < board.height
  );
}

function areSquaresEqual(left: Square, right: Square): boolean {
  return left.file === right.file && left.rank === right.rank;
}

function serializeSquare(square: Square): string {
  return `${square.file},${square.rank}`;
}

function getOpponent(player: PlayerColor): PlayerColor {
  return player === "white" ? "black" : "white";
}

function sortPieces(pieces: readonly PieceState[]): readonly PieceState[] {
  return [...pieces].sort((left, right) => left.id.localeCompare(right.id));
}

function canApplyUpgrade(
  board: BoardState,
  piece: RookyState,
  direction: Direction,
): boolean {
  return piece.ranges[direction] < getDirectionRangeCap(board, direction);
}

function getDirectionRangeCap(board: BoardState, direction: Direction): number {
  if (direction === "east" || direction === "west") {
    return Math.max(0, board.width - 1);
  }

  return Math.max(0, board.height - 1);
}
