import { useLayoutEffect, useRef, useState } from 'react'
import { nanoid } from 'nanoid'

import './App.css'
import {
  BoardPanel,
  type BoardSquareViewModel,
} from './components/BoardPanel'
import { GameLogPanel } from './components/GameLogPanel'
import { MultiplayerPanel } from './components/MultiplayerPanel'
import { UiOptionsPanel } from './components/UiOptionsPanel'
import {
  boardOrientationOptions,
  type BoardOrientationId,
  fileLabelOptions,
  playerPaletteOptions,
  type BoardOrientationOption,
  type FileLabelOption,
  type FileLabelSetId,
  type PlayerPaletteId,
  type PlayerPaletteOption,
} from './components/uiOptionsConfig'
import {
  applyAction,
  createClassicGameState,
  evaluateTurn,
  getPieceAtSquare,
  type GameState,
  type MoveAction,
  type PieceState,
  type PlayerColor,
  type Square,
  type TurnAction,
  type UpgradeAction,
} from './modules/core'
import { describeAction, describeStatus, formatSquare } from './modules/ui'
import { useKeyboardControl } from './hooks/useKeyboardControl'
import { useLocalPersistence, GAME_STORAGE_KEY, LOG_STORAGE_KEY } from './hooks/useLocalPersistence'
import { useMultiplayer } from './hooks/useMultiplayer'
import type { ActionLogEntry } from './hooks/types'

interface AppProps {
  readonly initialGameState?: GameState
  readonly initialSearchParams?: string
}

const playerThemeClassNames: Record<string, string> = {
  'black-white': 'theme-black-white',
  'yellow-red': 'theme-yellow-red',
  'red-blue': 'theme-red-blue',
  'yellow-blue': 'theme-yellow-blue',
}

function App({ initialGameState, initialSearchParams }: AppProps) {
  const [gameState, setGameState] = useState<GameState>(() => {
    if (initialGameState !== undefined) return initialGameState
    try {
      const raw = localStorage.getItem(GAME_STORAGE_KEY)
      if (raw !== null) return JSON.parse(raw) as GameState
    } catch { /* corrupted — use fresh state */ }
    return createClassicGameState()
  })
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null)
  const [actionLog, setActionLog] = useState<readonly ActionLogEntry[]>(() => {
    if (initialGameState !== undefined) return []
    try {
      const raw = localStorage.getItem(LOG_STORAGE_KEY)
      if (raw !== null) return JSON.parse(raw) as readonly ActionLogEntry[]
    } catch { /* corrupted — use empty log */ }
    return []
  })
  const [playerPaletteId, setPlayerPaletteId] = useState<PlayerPaletteId>('black-white')
  const [fileLabelSetId, setFileLabelSetId] = useState<FileLabelSetId>('alpha')
  const [boardOrientationId, setBoardOrientationId] = useState<BoardOrientationId>('first-player')
  const [showReachableSquares, setShowReachableSquares] = useState(true)
  const boardPanelRef = useRef<HTMLElement>(null)

  const fileLabels = getFileLabelOption(fileLabelSetId).labels
  const fileLabelsRef = useRef(fileLabels)
  const playerPaletteRef = useRef(getPlayerPalette(playerPaletteId))
  useLayoutEffect(() => {
    fileLabelsRef.current = fileLabels
    playerPaletteRef.current = getPlayerPalette(playerPaletteId)
  })

  // All function declarations below are hoisted, so they can be referenced here
  useLocalPersistence(gameState, actionLog, initialGameState === undefined)

  const { multiplayer, localPlayerColor, sessionHandleRef, handleHostGame, handleLeaveMultiplayer } =
    useMultiplayer({
      initialSearchParams,
      gameState,
      setGameState,
      setActionLog,
      resetSelection,
      fileLabelsRef,
      playerPaletteRef,
    })

  const evaluation = evaluateTurn(gameState)
  const selectedPiece =
    selectedPieceId === null
      ? null
      : gameState.pieces.find((piece) => piece.id === selectedPieceId)!
  const selectedPieceActions =
    selectedPiece === null
      ? []
      : evaluation.legalActions.filter((action) => action.pieceId === selectedPiece.id)
  const selectedPieceMoveActions = selectedPieceActions.filter(
    (action): action is MoveAction => action.type === 'move',
  )
  const selectedPieceUpgradeActions = selectedPieceActions.filter(
    (action): action is UpgradeAction => action.type === 'upgrade',
  )

  const keyboardActions = [
    ...selectedPieceMoveActions.map((action) => ({
      action,
      label: `Move to ${formatSquare(action.to, fileLabels)}`,
    })),
    ...selectedPieceUpgradeActions.map((action) => ({
      action,
      label: `Upgrade ${action.direction}`,
    })),
  ]

  const { activeKeyboardAction, resetActiveIndex, clearCoordinateBuffer, handleKeyboardActionKeyDown } =
    useKeyboardControl({
      gameState,
      fileLabels,
      keyboardActions,
      selectedPieceId,
      onSelectPiece: handlePieceSelection,
      onCommitAction: commitAction,
      onResetSelection: resetSelection,
    })

  const activePlayerLabel = getPlayerPalette(playerPaletteId).labels[gameState.turn.activePlayer]
  const boardBottomPlayer = getBoardBottomPlayer(boardOrientationId, gameState.turn.activePlayer)
  const isBoardRotated = boardBottomPlayer === 'black'
  const boardFileAxisLabels = isBoardRotated
    ? [...fileLabels].reverse()
    : [...fileLabels]
  const boardRankAxisLabels = Array.from({ length: gameState.variant.board.height }, (_, index) =>
    isBoardRotated ? index + 1 : gameState.variant.board.height - index,
  )
  const reachableSquareSets = showReachableSquares
    ? {
        white: getReachableSquareSet(gameState, 'white'),
        black: getReachableSquareSet(gameState, 'black'),
      }
    : {
        white: new Set<string>(),
        black: new Set<string>(),
      }

  const boardSquares: BoardSquareViewModel[] = []

  const rankIndexes = isBoardRotated
    ? Array.from({ length: gameState.variant.board.height }, (_, index) => index)
    : Array.from({ length: gameState.variant.board.height }, (_, index) => gameState.variant.board.height - 1 - index)
  const fileIndexes = isBoardRotated
    ? Array.from({ length: gameState.variant.board.width }, (_, index) => gameState.variant.board.width - 1 - index)
    : Array.from({ length: gameState.variant.board.width }, (_, index) => index)

  for (const rank of rankIndexes) {
    for (const file of fileIndexes) {
      const square = { file, rank }
      const squareKey = serializeSquare(square)
      const piece = getPieceAtSquare(gameState, square)

      boardSquares.push({
        square,
        piece,
        squareKey,
        isMoveTarget: selectedPieceMoveActions.some((action) => areSquaresEqual(action.to, square)),
        isSelected: piece?.id === selectedPieceId,
        isPieceSelectable:
          piece?.owner === gameState.turn.activePlayer &&
          evaluation.legalActions.some((action) => action.pieceId === piece.id) &&
          (localPlayerColor === null || localPlayerColor === piece?.owner),
        reachableClassName: getReachableClassName(squareKey, reachableSquareSets),
        upgradeActions: piece?.id === selectedPieceId ? selectedPieceUpgradeActions : [],
      })
    }
  }

  function resetSelection() {
    setSelectedPieceId(null)
    resetActiveIndex()
  }

  function handlePieceSelection(piece: PieceState) {
    if (localPlayerColor !== null && piece.owner !== localPlayerColor) {
      return
    }
    const pieceActions = evaluation.legalActions.filter((action) => action.pieceId === piece.id)

    if (pieceActions.length === 0) {
      return
    }

    setSelectedPieceId(piece.id)
  }

  function handleSquarePress(square: Square) {
    const occupant = getPieceAtSquare(gameState, square)

    if (occupant && occupant.owner === gameState.turn.activePlayer) {
      handlePieceSelection(occupant)
      return
    }

    if (selectedPiece === null) {
      return
    }

    const moveAction = selectedPieceMoveActions.find((action) => areSquaresEqual(action.to, square))

    if (!moveAction) {
      return
    }

    commitAction(moveAction)
  }

  function commitAction(action: TurnAction) {
    const movingPiece = gameState.pieces.find((piece) => piece.id === action.pieceId)!

    const capturedPiece =
      action.type === 'move' ? getPieceAtSquare(gameState, action.to) : undefined
    const nextState = applyAction(gameState, action)
    const nextEvaluation = evaluateTurn(nextState)

    setActionLog((previous) => [
      ...previous,
      {
        ply: gameState.turn.ply,
        text: describeAction(movingPiece!, action, capturedPiece, fileLabels),
        outcome: describeStatus(nextEvaluation.status, getPlayerPalette(playerPaletteId).labels),
      },
    ])
    setGameState(nextState)
    resetSelection()

    if (multiplayer.active && multiplayer.status === 'connected') {
      sessionHandleRef.current!.send({
        type: 'action',
        actionId: nanoid(),
        turn: gameState.turn.ply,
        payload: action,
      })
    }
  }

  function handleRestart() {
    setGameState(initialGameState ?? createClassicGameState())
    setActionLog([])
    resetSelection()
    clearCoordinateBuffer()
  }

  return (
    <main className={`app-shell ${playerThemeClassNames[playerPaletteId]}`}>
      <header className="hero card">
        <div>
          <p className="eyebrow">Classic Rookys</p>
          <h1>Classic Rookys Match</h1>
          <p>
            Select a piece, choose a move or upgrade, then commit the action.
          </p>
        </div>

        <div className="hero-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={handleRestart}
            disabled={multiplayer.active}
          >
            Restart match
          </button>
          <button className="secondary-button" type="button" disabled>
            Undo unavailable in final rules
          </button>
        </div>
      </header>

      <section className="dashboard-grid">
        <BoardPanel
          sectionRef={boardPanelRef}
          boardWidth={gameState.variant.board.width}
          boardSquares={boardSquares}
          fileLabels={fileLabels}
          boardFileAxisLabels={boardFileAxisLabels}
          boardRankAxisLabels={boardRankAxisLabels}
          isBoardRotated={isBoardRotated}
          activePlayerLabel={activePlayerLabel}
          statusText={describeStatus(evaluation.status, getPlayerPalette(playerPaletteId).labels)}
          statusKind={evaluation.status.kind}
          activeKeyboardAction={activeKeyboardAction}
          hasSelection={selectedPieceId !== null}
          onSquarePress={handleSquarePress}
          onUpgradePress={commitAction}
          onKeyboardActionKeyDown={handleKeyboardActionKeyDown}
          describeSquareForAssistiveTech={(square, piece) =>
            describeSquareForAssistiveTech(square, piece, fileLabels)
          }
        />

        <section className="sidebar-stack">
          <MultiplayerPanel
            active={multiplayer.active}
            role={multiplayer.active ? multiplayer.role : null}
            status={multiplayer.active ? multiplayer.status : null}
            localPeerId={multiplayer.active ? multiplayer.localPeerId : null}
            shareUrl={
              multiplayer.active && multiplayer.localPeerId !== null
                ? `${window.location.origin}${window.location.pathname}?join=${multiplayer.localPeerId}`
                : null
            }
            onHostGame={handleHostGame}
            onLeaveMultiplayer={handleLeaveMultiplayer}
          />
          <UiOptionsPanel
            playerPaletteId={playerPaletteId}
            fileLabelSetId={fileLabelSetId}
            boardOrientationId={boardOrientationId}
            showReachableSquares={showReachableSquares}
            onPlayerPaletteChange={(id) => { setPlayerPaletteId(id); boardPanelRef.current?.focus() }}
            onFileLabelSetChange={(id) => { setFileLabelSetId(id); boardPanelRef.current?.focus() }}
            onBoardOrientationChange={(id) => { setBoardOrientationId(id); boardPanelRef.current?.focus() }}
            onReachableSquaresChange={(v) => { setShowReachableSquares(v); boardPanelRef.current?.focus() }}
          />

          <GameLogPanel entries={actionLog} />
        </section>
      </section>
    </main>
  )
}

function getPlayerPalette(id: PlayerPaletteId): PlayerPaletteOption {
  return playerPaletteOptions.find((option) => option.id === id)!
}

function getFileLabelOption(id: FileLabelSetId): FileLabelOption {
  return fileLabelOptions.find((option) => option.id === id)!
}

function getBoardOrientationOption(id: BoardOrientationId): BoardOrientationOption {
  return boardOrientationOptions.find((option) => option.id === id)!
}

function getBoardBottomPlayer(
  orientationId: BoardOrientationId,
  activePlayer: PlayerColor,
): PlayerColor {
  const orientation = getBoardOrientationOption(orientationId)

  if (orientation.id === 'first-player') {
    return 'white'
  }

  if (orientation.id === 'second-player') {
    return 'black'
  }

  return activePlayer
}

function getReachableSquareSet(
  state: GameState,
  player: PlayerColor,
): ReadonlySet<string> {
  const actions = evaluateTurn({
    ...state,
    turn: {
      ...state.turn,
      activePlayer: player,
    },
  }).legalActions

  return new Set(
    actions
      .filter((action): action is MoveAction => action.type === 'move')
      .map((action) => serializeSquare(action.to)),
  )
}

function getReachableClassName(
  squareKey: string,
  reachableSquareSets: Record<PlayerColor, ReadonlySet<string>>,
): string {
  const whiteReachable = reachableSquareSets.white.has(squareKey)
  const blackReachable = reachableSquareSets.black.has(squareKey)

  if (whiteReachable && blackReachable) {
    return 'reachable-both'
  }

  if (whiteReachable) {
    return 'reachable-white'
  }

  if (blackReachable) {
    return 'reachable-black'
  }

  return ''
}

function describeSquareForAssistiveTech(
  square: Square,
  piece: PieceState | undefined,
  fileLabels: readonly string[],
): string {
  const squareLabel = formatSquare(square, fileLabels)

  if (!piece) {
    return `Square ${squareLabel}, empty`
  }

  return `Square ${squareLabel}, ${piece.owner} ${piece.kind}`
}

function serializeSquare(square: Square): string {
  return `${square.file},${square.rank}`
}

function areSquaresEqual(left: Square, right: Square): boolean {
  return left.file === right.file && left.rank === right.rank
}

export default App
