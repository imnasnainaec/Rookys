import type { ConnectionStatus, MultiplayerRole } from '../modules/networking'

type MultiplayerPanelProps = {
  readonly active: boolean
  readonly role: MultiplayerRole | null
  readonly status: ConnectionStatus | null
  readonly localPeerId: string | null
  readonly shareUrl: string | null
  readonly onHostGame: () => void
  readonly onLeaveMultiplayer: () => void
}

const statusMessages: Record<ConnectionStatus, string> = {
  idle: 'Setting up connection…',
  hosting: 'Waiting for opponent to join…',
  connecting: 'Connecting to host…',
  connected: 'Opponent connected.',
  reconnecting: 'Connection lost — reconnecting…',
  'peer-disconnected': 'Opponent disconnected.',
}

export function MultiplayerPanel({
  active,
  role,
  status,
  localPeerId,
  shareUrl,
  onHostGame,
  onLeaveMultiplayer,
}: MultiplayerPanelProps) {
  return (
    <section className="card multiplayer-panel">
      <div className="panel-heading">
        <div>
          <h2>Multiplayer</h2>
          <p>Play over a peer-to-peer connection.</p>
        </div>
        {active && (
          <span
            className="connection-status-pill"
            data-status={status}
          >
            {role === 'host' ? 'Host' : 'Guest'}
          </span>
        )}
      </div>

      {!active && (
        <div className="option-group">
          <p className="multiplayer-hint">
            Host a game and share the link, or visit a shared link to join.
          </p>
          <button
            className="secondary-button"
            type="button"
            onClick={onHostGame}
          >
            Host Game
          </button>
        </div>
      )}

      {active && (
        <div className="option-group">
          <p className="connection-message">
            {status !== null ? statusMessages[status] : ''}
          </p>

          {status === 'hosting' && shareUrl !== null && localPeerId !== null && (
            <div className="share-url-group">
              <span className="option-label">Share link</span>
              <input
                className="share-url-input"
                type="text"
                readOnly
                value={shareUrl}
                aria-label="Share link"
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          )}

          <button
            className="secondary-button"
            type="button"
            onClick={onLeaveMultiplayer}
          >
            Leave Game
          </button>
        </div>
      )}
    </section>
  )
}
