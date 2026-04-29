type GameLogEntry = {
  readonly ply: number
  readonly text: string
  readonly outcome: string
}

type GameLogPanelProps = {
  readonly entries: readonly GameLogEntry[]
}

export function GameLogPanel({ entries }: GameLogPanelProps) {
  return (
    <section className="card log-panel">
      <div className="panel-heading">
        <div>
          <h2>Game Log</h2>
          <p>Move and upgrade history with resulting state.</p>
        </div>
      </div>

      <ol className="log-list">
        {entries.length > 0 ? (
          entries.map((entry) => (
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
  )
}
