import { useState } from 'react'

import './App.css'
import {
  applyAction,
  createClassicGameState,
  evaluateTurn,
  getPieceAtSquare,
  type Direction,
  type GameState,
  type MoveAction,
  type PieceState,
  type PlayerColor,
  type Square,
  type TurnAction,
} from './modules/core'

type PlayerPaletteOption = {
  readonly id: PlayerPaletteId
  readonly label: string
  readonly labels: Record<PlayerColor, string>
}

type FileLabelOption = {
  readonly id: FileLabelSetId
  readonly label: string
  readonly labels: readonly string[]
}

type PlayerPaletteId = 'black-white' | 'yellow-red' | 'red-blue' | 'yellow-blue'
type FileLabelSetId = 'alpha' | 'qwert' | 'home' | 'bottom'

type ActionLogEntry = {
  readonly ply: number
  readonly text: string
  readonly outcome: string
}

interface AppProps {
  readonly initialGameState?: GameState
}

const playerPaletteOptions: readonly PlayerPaletteOption[] = [
  {
    id: 'black-white',
    label: 'Black vs White',
    labels: { white: 'White', black: 'Black' },
  },
  {
    id: 'yellow-red',
    label: 'Yellow vs Red',
    labels: { white: 'Yellow', black: 'Red' },
  },
  {
    id: 'red-blue',
    label: 'Red vs Blue',
    labels: { white: 'Red', black: 'Blue' },
  },
  {
    id: 'yellow-blue',
    label: 'Yellow vs Blue',
    labels: { white: 'Yellow', black: 'Blue' },
  },
] as const

const fileLabelOptions: readonly FileLabelOption[] = [
  { id: 'alpha', label: 'a, b, c, d, e', labels: ['a', 'b', 'c', 'd', 'e'] },
  { id: 'qwert', label: 'q, w, e, r, t', labels: ['q', 'w', 'e', 'r', 't'] },
  { id: 'home', label: 'a, s, d, f, g', labels: ['a', 's', 'd', 'f', 'g'] },
  { id: 'bottom', label: 'z, x, c, v, b', labels: ['z', 'x', 'c', 'v', 'b'] },
] as const

const directionLabels: Record<Direction, string> = {
  north: 'North',
  south: 'South',
  east: 'East',
  west: 'West',
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
  const [selectedActionType, setSelectedActionType] = useState<TurnAction['type'] | null>(null)
  const [actionLog, setActionLog] = useState<readonly ActionLogEntry[]>([])
  const [playerPaletteId, setPlayerPaletteId] = useState<PlayerPaletteId>('black-white')
  const [fileLabelSetId, setFileLabelSetId] = useState<FileLabelSetId>('alpha')
  const [showReachableSquares, setShowReachableSquares] = useState(true)

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
    (action) => action.type === 'upgrade',
  )
  const availableActionTypes = Array.from(new Set(selectedPieceActions.map((action) => action.type)))
  const fileLabels = getFileLabelOption(fileLabelSetId).labels
  const reachableSquareSets = showReachableSquares
    ? {
        white: getReachableSquareSet(gameState, 'white'),
        black: getReachableSquareSet(gameState, 'black'),
      }
    : {
        white: new Set<string>(),
        black: new Set<string>(),
      }

  const boardSquares = [] as Array<{
    square: Square
    piece: PieceState | undefined
    squareKey: string
    isMoveTarget: boolean
    isSelected: boolean
    isPieceSelectable: boolean
    reachableClassName: string
  }>

  for (let rank = gameState.variant.board.height - 1; rank >= 0; rank -= 1) {
    for (let file = 0; file < gameState.variant.board.width; file += 1) {
      const square = { file, rank }
      const squareKey = serializeSquare(square)
      const piece = getPieceAtSquare(gameState, square)

      boardSquares.push({
        square,
        piece,
        squareKey,
        isMoveTarget:
          selectedActionType === 'move' &&
          selectedPieceMoveActions.some((action) => areSquaresEqual(action.to, square)),
        isSelected: piece?.id === selectedPieceId,
        isPieceSelectable:
          piece?.owner === gameState.turn.activePlayer &&
          evaluation.legalActions.some((action) => action.pieceId === piece.id),
        reachableClassName: getReachableClassName(squareKey, reachableSquareSets),
      })
    }
  }

  function resetSelection() {
    setSelectedPieceId(null)
    setSelectedActionType(null)
  }

  function handlePieceSelection(piece: PieceState) {
    const pieceActions = evaluation.legalActions.filter((action) => action.pieceId === piece.id)

    if (pieceActions.length === 0) {
      return
    }

    setSelectedPieceId(piece.id)

    const nextActionTypes = Array.from(new Set(pieceActions.map((action) => action.type)))

    if (nextActionTypes.length === 1) {
      setSelectedActionType(nextActionTypes[0])
      return
    }

    setSelectedActionType(null)
  }

  function handleSquarePress(square: Square) {
    const occupant = getPieceAtSquare(gameState, square)

    if (occupant && occupant.owner === gameState.turn.activePlayer) {
      handlePieceSelection(occupant)
      return
    }

    if (selectedActionType !== 'move' || selectedPiece === null) {
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
        <section className="card board-panel" aria-label="Game board panel">
          <div className="panel-heading">
            <div>
              <h2>Board</h2>
              <p>{activePlayerLabel} to act</p>
            </div>
            <div className="status-pill" data-status={evaluation.status.kind}>
              {describeStatus(evaluation.status, getPlayerPalette(playerPaletteId).labels)}
            </div>
          </div>

          <div className="board-wrapper">
            <div className="board-ranks" aria-hidden="true">
              {Array.from({ length: gameState.variant.board.height }, (_, index) => {
                const rankValue = gameState.variant.board.height - index

                return (
                  <span key={rankValue} className="axis-label">
                    {rankValue}
                  </span>
                )
              })}
            </div>

            <div
              className="board-grid"
              role="grid"
              aria-label="Rookys board"
              style={{
                gridTemplateColumns: `repeat(${gameState.variant.board.width}, minmax(0, 1fr))`,
              }}
            >
              {boardSquares.map(
                ({
                  square,
                  piece,
                  squareKey,
                  isMoveTarget,
                  isSelected,
                  isPieceSelectable,
                  reachableClassName,
                }) => (
                  <button
                    key={squareKey}
                    className={[
                      'board-square',
                      (square.file + square.rank) % 2 === 0 ? 'light-square' : 'dark-square',
                      piece?.owner === 'white' ? 'piece-white' : '',
                      piece?.owner === 'black' ? 'piece-black' : '',
                      isMoveTarget ? 'move-target' : '',
                      isSelected ? 'selected-square' : '',
                      isPieceSelectable ? 'selectable-square' : '',
                      reachableClassName,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    type="button"
                    role="gridcell"
                    aria-pressed={isSelected}
                    aria-label={describeSquareForAssistiveTech(square, piece, fileLabels)}
                    onClick={() => handleSquarePress(square)}
                  >
                    <span className="square-coordinate">
                      {fileLabels[square.file]}
                      {square.rank + 1}
                    </span>
                    {piece ? (
                      <span className="piece-stack">
                        <span className="piece-symbol">{piece.kind === 'king' ? 'K' : 'R'}</span>
                        <span className="piece-meta">
                          {getPlayerPalette(playerPaletteId).labels[piece.owner]}
                          {piece.kind === 'rooky'
                            ? ` ${formatRookyRanges(piece)}`
                            : ' king'}
                        </span>
                      </span>
                    ) : isMoveTarget ? (
                      <span className="target-marker">Move</span>
                    ) : null}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="board-files" aria-hidden="true">
            {fileLabels.map((label) => (
              <span key={label} className="axis-label">
                {label}
              </span>
            ))}
          </div>
        </section>

        <section className="sidebar-stack">
          <section className="card control-panel">
            <div className="panel-heading">
              <div>
                <h2>Turn Controls</h2>
                <p>
                  {selectedPiece
                    ? `Selected ${getPlayerPalette(playerPaletteId).labels[selectedPiece.owner]} ${selectedPiece.kind}`
                    : 'Select an active piece to continue'}
                </p>
              </div>
            </div>

            <div className="selection-panel">
              <div className="action-choice-row" role="group" aria-label="Action choices">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!availableActionTypes.includes('move')}
                  data-active={selectedActionType === 'move'}
                  onClick={() => setSelectedActionType('move')}
                >
                  Choose move
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!availableActionTypes.includes('upgrade')}
                  data-active={selectedActionType === 'upgrade'}
                  onClick={() => setSelectedActionType('upgrade')}
                >
                  Choose upgrade
                </button>
                <button className="ghost-button" type="button" onClick={resetSelection}>
                  Clear
                </button>
              </div>

              <div className="target-grid">
                <div>
                  <h3>Move targets</h3>
                  <ul className="target-list">
                    {selectedPieceMoveActions.length > 0 ? (
                      selectedPieceMoveActions.map((action) => (
                        <li key={`${action.pieceId}-${serializeSquare(action.to)}`}>
                          <button
                            className="secondary-button target-button"
                            type="button"
                            disabled={selectedActionType !== 'move'}
                            onClick={() => commitAction(action)}
                          >
                            {formatSquare(action.to, fileLabels)}
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="empty-state">No legal move targets</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h3>Upgrade directions</h3>
                  <ul className="target-list">
                    {selectedPieceUpgradeActions.length > 0 ? (
                      selectedPieceUpgradeActions.map((action) => (
                        <li key={`${action.pieceId}-${action.direction}`}>
                          <button
                            className="secondary-button target-button"
                            type="button"
                            disabled={selectedActionType !== 'upgrade'}
                            onClick={() => commitAction(action)}
                          >
                            {directionLabels[action.direction]}
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="empty-state">No legal upgrades</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="card options-panel">
            <div className="panel-heading">
              <div>
                <h2>UI Options</h2>
                <p>Match palette, file labels, and reachable-square overlays.</p>
              </div>
            </div>

            <div className="option-group">
              <span className="option-label">Piece colors</span>
              <div className="chip-row" role="radiogroup" aria-label="Piece color options">
                {playerPaletteOptions.map((option) => (
                  <button
                    key={option.id}
                    className="chip-button"
                    type="button"
                    aria-pressed={playerPaletteId === option.id}
                    onClick={() => setPlayerPaletteId(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="option-group">
              <span className="option-label">File labels</span>
              <div className="chip-row" role="radiogroup" aria-label="File label options">
                {fileLabelOptions.map((option) => (
                  <button
                    key={option.id}
                    className="chip-button"
                    type="button"
                    aria-pressed={fileLabelSetId === option.id}
                    onClick={() => setFileLabelSetId(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="toggle-row">
              <input
                checked={showReachableSquares}
                type="checkbox"
                onChange={(event) => setShowReachableSquares(event.target.checked)}
              />
              <span>Show reachable-square highlighting</span>
            </label>
          </section>

          <section className="card log-panel">
            <div className="panel-heading">
              <div>
                <h2>Game Log</h2>
                <p>Move and upgrade history with resulting state.</p>
              </div>
            </div>

            <ol className="log-list">
              {actionLog.length > 0 ? (
                actionLog.map((entry) => (
                  <li key={`${entry.ply}-${entry.text}`}>
                    <strong>Ply {entry.ply}</strong>
                    <span>{entry.text}</span>
                    <em>{entry.outcome}</em>
                  </li>
                ))
              ) : (
                <li className="empty-state">No actions yet.</li>
              )}
            </ol>
          </section>
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
