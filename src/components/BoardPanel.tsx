import { useEffect } from 'react'

import type {
  Direction,
  PieceState,
  Square,
  TurnAction,
  UpgradeAction,
} from '../modules/core'

export type BoardSquareViewModel = {
  readonly square: Square
  readonly piece: PieceState | undefined
  readonly squareKey: string
  readonly isMoveTarget: boolean
  readonly isSelected: boolean
  readonly isPieceSelectable: boolean
  readonly reachableClassName: string
  readonly upgradeActions: readonly UpgradeAction[]
}

type BoardPanelProps = {
  readonly boardWidth: number
  readonly boardSquares: readonly BoardSquareViewModel[]
  readonly fileLabels: readonly string[]
  readonly boardFileAxisLabels: readonly string[]
  readonly boardRankAxisLabels: readonly number[]
  readonly isBoardRotated: boolean
  readonly activePlayerLabel: string
  readonly statusText: string
  readonly statusKind: string
  readonly activeKeyboardAction: TurnAction | null
  readonly hasSelection: boolean
  readonly sectionRef: React.RefObject<HTMLElement | null>
  readonly onSquarePress: (square: Square) => void
  readonly onUpgradePress: (action: UpgradeAction) => void
  readonly onKeyboardActionKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
  readonly describeSquareForAssistiveTech: (square: Square, piece: PieceState | undefined) => string
}

const directionLabels: Record<Direction, string> = {
  north: 'North',
  south: 'South',
  east: 'East',
  west: 'West',
}

const directionAbbreviations: Record<Direction, string> = {
  north: 'N',
  south: 'S',
  east: 'E',
  west: 'W',
}

function getDisplayDirection(direction: Direction, isBoardRotated: boolean): Direction {
  if (!isBoardRotated) {
    return direction
  }

  if (direction === 'north') {
    return 'south'
  }

  if (direction === 'south') {
    return 'north'
  }

  if (direction === 'east') {
    return 'west'
  }

  return 'east'
}

export function BoardPanel({
  boardWidth,
  boardSquares,
  fileLabels,
  boardFileAxisLabels,
  boardRankAxisLabels,
  isBoardRotated,
  activePlayerLabel,
  statusText,
  statusKind,
  activeKeyboardAction,
  hasSelection,
  sectionRef,
  onSquarePress,
  onUpgradePress,
  onKeyboardActionKeyDown,
  describeSquareForAssistiveTech,
}: BoardPanelProps) {
  useEffect(() => {
    sectionRef.current?.focus()
  }, [sectionRef])

  function renderPieceShape(piece: PieceState) {
    if (piece.kind === 'king') {
      return (
        <svg
          className="piece-svg king-svg"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <polygon points="50,0 61.5,22.3 85.4,14.6 77.7,38.5 100,50 77.7,61.5 85.4,85.4 61.5,77.7 50,100 38.5,77.7 14.6,85.4 22.3,61.5 0,50 22.3,38.5 14.6,14.6 38.5,22.3" />
          <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize={30} className="piece-letter">K</text>
        </svg>
      )
    }
    const { north, east, south, west } = piece.ranges
    const displayRanges = isBoardRotated
      ? {
          north: south,
          east: west,
          south: north,
          west: east,
        }
      : {
          north,
          east,
          south,
          west,
        }
    return (
      <svg
        className="piece-svg rooky-svg"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <polygon points="50,4 96,50 50,96 4,50" />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize={28} className="piece-letter">R</text>
        <text x="50" y="17" textAnchor="middle" dominantBaseline="central" fontSize={17} className="range-numeral">{displayRanges.north}</text>
        <text x="83" y="50" textAnchor="middle" dominantBaseline="central" fontSize={17} className="range-numeral">{displayRanges.east}</text>
        <text x="50" y="83" textAnchor="middle" dominantBaseline="central" fontSize={17} className="range-numeral">{displayRanges.south}</text>
        <text x="17" y="50" textAnchor="middle" dominantBaseline="central" fontSize={17} className="range-numeral">{displayRanges.west}</text>
      </svg>
    )
  }

  return (
    <section ref={sectionRef} tabIndex={-1} className="card board-panel" aria-label="Game board panel" onKeyDown={onKeyboardActionKeyDown}>
      <div className="panel-heading">
        <div>
          <h2>Board</h2>
          <p>{activePlayerLabel} to act</p>
        </div>
        <div className="status-pill" data-status={statusKind}>
          {statusText}
        </div>
      </div>

      <div className="board-wrapper">
        <div className="board-ranks" aria-hidden="true">
          {boardRankAxisLabels.map((label) => (
            <span key={label} className="axis-label">
              {label}
            </span>
          ))}
        </div>

        <div
          className="board-grid"
          role="grid"
          aria-label="Rookys board"
          style={{
            gridTemplateColumns: `repeat(${boardWidth}, minmax(0, 1fr))`,
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
              upgradeActions,
            }) => {
              const keyboardMoveTarget =
                activeKeyboardAction?.type === 'move' &&
                activeKeyboardAction.to.file === square.file &&
                activeKeyboardAction.to.rank === square.rank

              return (
                <div
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
                    keyboardMoveTarget ? 'keyboard-target' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="gridcell"
                  aria-label={describeSquareForAssistiveTech(square, piece)}
                  onClick={() => onSquarePress(square)}
                  onKeyDown={(event) => {
                    if (event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      onSquarePress(square)
                    } else if (event.key === 'Enter' && !hasSelection) {
                      event.preventDefault()
                      event.stopPropagation()
                      onSquarePress(square)
                    }
                  }}
                  tabIndex={0}
                >
                  <span className="square-coordinate">
                    {fileLabels[square.file]}
                    {square.rank + 1}
                  </span>
                  {piece ? (
                    renderPieceShape(piece)
                  ) : isMoveTarget ? (
                    <span className="target-marker">Move</span>
                  ) : null}

                  {isSelected && upgradeActions.length > 0 ? (
                    <div className="upgrade-overlay" role="group" aria-label="On-board upgrade options">
                      {upgradeActions.map((action) => {
                        const isKeyboardUpgradeTarget =
                          activeKeyboardAction?.type === 'upgrade' &&
                          activeKeyboardAction.direction === action.direction
                        const displayDirection = getDisplayDirection(action.direction, isBoardRotated)

                        return (
                          <button
                            key={action.direction}
                            className={[
                              'upgrade-chip',
                              `upgrade-${displayDirection}`,
                              isKeyboardUpgradeTarget ? 'keyboard-target' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            type="button"
                            aria-label={`Upgrade ${directionLabels[action.direction]}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              onUpgradePress(action)
                            }}
                          >
                            {directionAbbreviations[action.direction]}
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            },
          )}
        </div>
      </div>

      <div className="board-files" aria-hidden="true">
        {boardFileAxisLabels.map((label) => (
          <span key={label} className="axis-label">
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
