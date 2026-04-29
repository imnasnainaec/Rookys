import { useState } from 'react'

import './App.css'
import {
  BoardPanel,
  type BoardSquareViewModel,
} from './components/BoardPanel'
import { GameLogPanel } from './components/GameLogPanel'
import { UiOptionsPanel } from './components/UiOptionsPanel'
import {
  fileLabelOptions,
  playerPaletteOptions,
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

type ActionLogEntry = {
  readonly ply: number
  readonly text: string
  readonly outcome: string
}

interface AppProps {
  readonly initialGameState?: GameState
}

const playerThemeClassNames: Record<string, string> = {
  'black-white': 'theme-black-white',
  'yellow-red': 'theme-yellow-red',
  'red-blue': 'theme-red-blue',
  'yellow-blue': 'theme-yellow-blue',
}

function App({ initialGameState }: AppProps) {
  const [gameState, setGameState] = useState<GameState>(() => initialGameState ?? createClassicGameState())
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null)
  const [actionLog, setActionLog] = useState<readonly ActionLogEntry[]>([])
  const [playerPaletteId, setPlayerPaletteId] = useState<PlayerPaletteId>('black-white')
  const [fileLabelSetId, setFileLabelSetId] = useState<FileLabelSetId>('alpha')
  const [showReachableSquares, setShowReachableSquares] = useState(true)
  const [activeKeyboardActionIndex, setActiveKeyboardActionIndex] = useState(0)
  const [coordinateBuffer, setCoordinateBuffer] = useState('')

  const evaluation = evaluateTurn(gameState)
  const activePlayerLabel = getPlayerPalette(playerPaletteId).labels[gameState.turn.activePlayer]
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
  const fileLabels = getFileLabelOption(fileLabelSetId).labels
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
  const normalizedKeyboardActionIndex =
    keyboardActions.length === 0 ? 0 : activeKeyboardActionIndex % keyboardActions.length
  const activeKeyboardAction =
    keyboardActions.length === 0 ? null : keyboardActions[normalizedKeyboardActionIndex].action
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

  for (let rank = gameState.variant.board.height - 1; rank >= 0; rank -= 1) {
    for (let file = 0; file < gameState.variant.board.width; file += 1) {
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
          evaluation.legalActions.some((action) => action.pieceId === piece.id),
        reachableClassName: getReachableClassName(squareKey, reachableSquareSets),
        upgradeActions: piece?.id === selectedPieceId ? selectedPieceUpgradeActions : [],
      })
    }
  }

  function resetSelection() {
    setSelectedPieceId(null)
    setActiveKeyboardActionIndex(0)
  }

  function handlePieceSelection(piece: PieceState) {
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
        text: describeAction(movingPiece, action, capturedPiece, fileLabels),
        outcome: describeStatus(nextEvaluation.status, getPlayerPalette(playerPaletteId).labels),
      },
    ])
    setGameState(nextState)
    resetSelection()
  }

  function handleRestart() {
    setGameState(initialGameState ?? createClassicGameState())
    setActionLog([])
    resetSelection()
    setCoordinateBuffer('')
  }

  function tryParseCoordinateAndSelect(buffer: string): boolean {
    if (buffer.length < 2) {
      return false
    }

    const fileChar = buffer.charAt(0)
    const rankChar = buffer.charAt(1)
    const altFileChar = buffer.charAt(1)
    const altRankChar = buffer.charAt(0)

    // Try file-rank order
    const fileIndex = fileLabels.findIndex((label) => label.toLowerCase() === fileChar.toLowerCase())
    const rankIndex = Number.parseInt(rankChar, 10) - 1

    if (fileIndex >= 0 && rankIndex >= 0 && rankIndex < gameState.variant.board.height) {
      const square: Square = { file: fileIndex, rank: rankIndex }
      const occupant = getPieceAtSquare(gameState, square)
      if (occupant && occupant.owner === gameState.turn.activePlayer) {
        handlePieceSelection(occupant)
        setCoordinateBuffer('')
        return true
      }
    }

    // Try rank-file order
    const altRankIndex = Number.parseInt(altRankChar, 10) - 1
    const altFileIndex = fileLabels.findIndex((label) => label.toLowerCase() === altFileChar.toLowerCase())

    if (altFileIndex >= 0 && altRankIndex >= 0 && altRankIndex < gameState.variant.board.height) {
      const square: Square = { file: altFileIndex, rank: altRankIndex }
      const occupant = getPieceAtSquare(gameState, square)
      if (occupant && occupant.owner === gameState.turn.activePlayer) {
        handlePieceSelection(occupant)
        setCoordinateBuffer('')
        return true
      }
    }

    return false
  }

  function handleKeyboardActionKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    // Check if input is a coordinate character (file label or rank digit)
    const fileLabelsLower = fileLabels.map((label) => label.toLowerCase())
    const isFileChar = fileLabelsLower.includes(event.key.toLowerCase())
    const isRankChar = /^[1-9]$/.test(event.key)

    if (isFileChar || isRankChar) {
      event.preventDefault()
      const newBuffer = coordinateBuffer + event.key.toLowerCase()
      setCoordinateBuffer(newBuffer)
      tryParseCoordinateAndSelect(newBuffer)
      return
    }

    if (keyboardActions.length === 0 && selectedPieceId === null && event.key !== 'Escape') {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setCoordinateBuffer('')
      resetSelection()
      return
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveKeyboardActionIndex((previous) => (previous + 1) % keyboardActions.length)
      return
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveKeyboardActionIndex(
        (previous) => (previous - 1 + keyboardActions.length) % keyboardActions.length,
      )
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      commitAction(keyboardActions[normalizedKeyboardActionIndex].action)
      setCoordinateBuffer('')
    }
  }

  return (
    <main className={`app-shell ${playerThemeClassNames[playerPaletteId]}`}>
      <header className="hero card">
        <div>
          <p className="eyebrow">Phase 3 Local Gameplay UI</p>
          <h1>Classic Rookys Match</h1>
          <p>
            Local turn flow is live: select a piece, choose move or upgrade, then
            commit the target action.
          </p>
        </div>

        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={handleRestart}>
            Restart match
          </button>
          <button className="secondary-button" type="button" disabled>
            Undo unavailable in final rules
          </button>
        </div>
      </header>

      <section className="dashboard-grid">
        <BoardPanel
          boardWidth={gameState.variant.board.width}
          boardHeight={gameState.variant.board.height}
          boardSquares={boardSquares}
          fileLabels={fileLabels}
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
          renderPieceMeta={(piece) =>
            `${getPlayerPalette(playerPaletteId).labels[piece.owner]}${
              piece.kind === 'rooky' ? ` ${formatRookyRanges(piece)}` : ' king'
            }`
          }
        />

        <section className="sidebar-stack">
          <UiOptionsPanel
            playerPaletteId={playerPaletteId}
            fileLabelSetId={fileLabelSetId}
            showReachableSquares={showReachableSquares}
            onPlayerPaletteChange={setPlayerPaletteId}
            onFileLabelSetChange={setFileLabelSetId}
            onReachableSquaresChange={setShowReachableSquares}
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

function describeAction(
  piece: PieceState,
  action: TurnAction,
  capturedPiece: PieceState | undefined,
  fileLabels: readonly string[],
): string {
  if (action.type === 'move') {
    const captureSuffix = capturedPiece ? `, capturing ${capturedPiece.id}` : ''

    return `${piece.id} moved to ${formatSquare(action.to, fileLabels)}${captureSuffix}`
  }

  return `${piece.id} upgraded ${action.direction}`
}

function describeStatus(
  status: GameState['status'],
  labels: Record<PlayerColor, string>,
): string {
  if (status.kind === 'check') {
    return `${labels[status.checkedPlayer]} in check`
  }

  if (status.kind === 'checkmate') {
    return `${labels[status.winner]} wins by checkmate`
  }

  if (status.kind === 'stalemate') {
    return status.reason === 'repetition'
      ? 'Stalemate by repetition'
      : 'Stalemate by no legal turn'
  }

  return 'Match ongoing'
}

function formatSquare(
  square: Square,
  fileLabels: readonly string[],
): string {
  return `${fileLabels[square.file]}${square.rank + 1}`
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

function formatRookyRanges(piece: Extract<PieceState, { kind: 'rooky' }>): string {
  return `N${piece.ranges.north} S${piece.ranges.south} E${piece.ranges.east} W${piece.ranges.west}`
}

function serializeSquare(square: Square): string {
  return `${square.file},${square.rank}`
}

function areSquaresEqual(left: Square, right: Square): boolean {
  return left.file === right.file && left.rank === right.rank
}

export default App
