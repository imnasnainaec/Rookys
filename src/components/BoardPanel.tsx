import type {
  Direction,
  PieceState,
  Square,
  TurnAction,
  UpgradeAction,
} from '../modules/core'

export type SelectionOrder = 'file-rank' | 'rank-file'

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
  readonly boardHeight: number
  readonly boardSquares: readonly BoardSquareViewModel[]
  readonly fileLabels: readonly string[]
  readonly activePlayerLabel: string
  readonly statusText: string
  readonly statusKind: string
  readonly selectedPieceSummary: string
  readonly keyboardSelectionOrder: SelectionOrder
  readonly keyboardSelectionInput: string
  readonly keyboardActions: readonly { readonly label: string; readonly action: TurnAction }[]
  readonly activeKeyboardActionIndex: number
  readonly activeKeyboardAction: TurnAction | null
  readonly onSquarePress: (square: Square) => void
  readonly onUpgradePress: (action: UpgradeAction) => void
  readonly onKeyboardSelectionOrderChange: (value: SelectionOrder) => void
  readonly onKeyboardSelectionInputChange: (value: string) => void
  readonly onKeyboardSelectionSubmit: () => void
  readonly onKeyboardActionKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
  readonly onClearSelection: () => void
  readonly describeSquareForAssistiveTech: (square: Square, piece: PieceState | undefined) => string
  readonly renderPieceMeta: (piece: PieceState) => string
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

export function BoardPanel({
  boardWidth,
  boardHeight,
  boardSquares,
  fileLabels,
  activePlayerLabel,
  statusText,
  statusKind,
  selectedPieceSummary,
  keyboardSelectionOrder,
  keyboardSelectionInput,
  keyboardActions,
  activeKeyboardActionIndex,
  activeKeyboardAction,
  onSquarePress,
  onUpgradePress,
  onKeyboardSelectionOrderChange,
  onKeyboardSelectionInputChange,
  onKeyboardSelectionSubmit,
  onKeyboardActionKeyDown,
  onClearSelection,
  describeSquareForAssistiveTech,
  renderPieceMeta,
}: BoardPanelProps) {
  return (
    <section className="card board-panel" aria-label="Game board panel">
      <div className="panel-heading">
        <div>
          <h2>Board</h2>
          <p>{activePlayerLabel} to act</p>
        </div>
        <div className="status-pill" data-status={statusKind}>
          {statusText}
        </div>
      </div>

      <div
        className="board-keyboard-shell"
        role="region"
        aria-label="Board keyboard controls"
        tabIndex={0}
        onKeyDown={onKeyboardActionKeyDown}
      >
        <p className="keyboard-hint">
          Selected piece: {selectedPieceSummary}. Use arrow keys to cycle move and upgrade options,
          then press Enter to submit.
        </p>

        <div className="keyboard-picker-row">
          <div className="chip-row" role="radiogroup" aria-label="Keyboard square input order">
            <button
              className="chip-button"
              type="button"
              aria-pressed={keyboardSelectionOrder === 'file-rank'}
              onClick={() => onKeyboardSelectionOrderChange('file-rank')}
            >
              File then rank
            </button>
            <button
              className="chip-button"
              type="button"
              aria-pressed={keyboardSelectionOrder === 'rank-file'}
              onClick={() => onKeyboardSelectionOrderChange('rank-file')}
            >
              Rank then file
            </button>
          </div>

          <div className="keyboard-input-row">
            <label htmlFor="square-picker-input" className="option-label">
              Keyboard square selection
            </label>
            <input
              id="square-picker-input"
              className="square-picker-input"
              value={keyboardSelectionInput}
              onChange={(event) => onKeyboardSelectionInputChange(event.target.value)}
              placeholder={keyboardSelectionOrder === 'file-rank' ? `${fileLabels[0]}1` : `1${fileLabels[0]}`}
              aria-label="Keyboard square selection"
            />
            <button className="secondary-button" type="button" onClick={onKeyboardSelectionSubmit}>
              Select square
            </button>
            <button className="ghost-button" type="button" onClick={onClearSelection}>
              Clear selection
            </button>
          </div>
        </div>

        {keyboardActions.length > 0 ? (
          <ol className="keyboard-option-list" aria-label="Keyboard action options">
            {keyboardActions.map((option, index) => (
              <li
                key={`${option.label}-${index}`}
                className={index === activeKeyboardActionIndex ? 'active-keyboard-option' : ''}
              >
                {option.label}
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-state">Select an active piece to populate keyboard options.</p>
        )}
      </div>

      <div className="board-wrapper">
        <div className="board-ranks" aria-hidden="true">
          {Array.from({ length: boardHeight }, (_, index) => {
            const rankValue = boardHeight - index

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
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
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
                    <span className="piece-stack">
                      <span className="piece-symbol">{piece.kind === 'king' ? 'K' : 'R'}</span>
                      <span className="piece-meta">{renderPieceMeta(piece)}</span>
                    </span>
                  ) : isMoveTarget ? (
                    <span className="target-marker">Move</span>
                  ) : null}

                  {isSelected && upgradeActions.length > 0 ? (
                    <div className="upgrade-overlay" role="group" aria-label="On-board upgrade options">
                      {upgradeActions.map((action) => {
                        const isKeyboardUpgradeTarget =
                          activeKeyboardAction?.type === 'upgrade' &&
                          activeKeyboardAction.direction === action.direction

                        return (
                          <button
                            key={action.direction}
                            className={[
                              'upgrade-chip',
                              `upgrade-${action.direction}`,
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
        {fileLabels.map((label) => (
          <span key={label} className="axis-label">
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
