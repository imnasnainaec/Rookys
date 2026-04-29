import {
  fileLabelOptions,
  playerPaletteOptions,
  type FileLabelSetId,
  type PlayerPaletteId,
} from './uiOptionsConfig'

type UiOptionsPanelProps = {
  readonly playerPaletteId: PlayerPaletteId
  readonly fileLabelSetId: FileLabelSetId
  readonly showReachableSquares: boolean
  readonly onPlayerPaletteChange: (id: PlayerPaletteId) => void
  readonly onFileLabelSetChange: (id: FileLabelSetId) => void
  readonly onReachableSquaresChange: (value: boolean) => void
}

export function UiOptionsPanel({
  playerPaletteId,
  fileLabelSetId,
  showReachableSquares,
  onPlayerPaletteChange,
  onFileLabelSetChange,
  onReachableSquaresChange,
}: UiOptionsPanelProps) {
  return (
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
              onClick={() => onPlayerPaletteChange(option.id)}
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
              onClick={() => onFileLabelSetChange(option.id)}
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
          onChange={(event) => onReachableSquaresChange(event.target.checked)}
        />
        <span>Show reachable-square highlighting</span>
      </label>
    </section>
  )
}
