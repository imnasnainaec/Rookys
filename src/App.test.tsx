import { fireEvent, render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import App from './App'
import { MultiplayerPanel } from './components/MultiplayerPanel'
import {
  createGameState,
  type DirectionalRanges,
  type GameState,
  type KingState,
  type PieceState,
  type RepetitionPly,
  type RookyState,
} from './modules/core'

const emptyRanges: DirectionalRanges = {
  north: 0,
  south: 0,
  east: 0,
  west: 0,
}

function king(
  id: string,
  owner: 'white' | 'black',
  file: number,
  rank: number,
): KingState {
  return {
    id,
    kind: 'king',
    owner,
    square: { file, rank },
  }
}

function rooky(
  id: string,
  owner: 'white' | 'black',
  file: number,
  rank: number,
  ranges: Partial<DirectionalRanges> = {},
): RookyState {
  return {
    id,
    kind: 'rooky',
    owner,
    square: { file, rank },
    ranges: {
      ...emptyRanges,
      ...ranges,
    },
  }
}

function createState(
  pieces: readonly PieceState[],
  options?: {
    activePlayer?: 'white' | 'black'
    recentPlies?: readonly RepetitionPly[]
  },
): GameState {
  return createGameState({
    pieces,
    activePlayer: options?.activePlayer,
    repetition: {
      recentPlies: options?.recentPlies,
    },
  })
}

describe('App', () => {
  it('renders the local gameplay board, controls, and options', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Classic Rookys Match',
      }),
    ).toBeTruthy()
    expect(screen.getByRole('grid', { name: 'Rookys board' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Restart match' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Undo unavailable in final rules' }).matches(':disabled'),
    ).toBe(true)
    expect(screen.getByText('UI Options')).toBeTruthy()
    expect(screen.getByText('Game Log')).toBeTruthy()
  })

  it('allows moving the opening white king through the turn flow', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getAllByLabelText('Square c1, white king')[0])

    await user.click(screen.getAllByLabelText('Square b2, empty')[0])

    expect(screen.getByText('Black to act')).toBeTruthy()
    expect(screen.getByText('white-king moved to b2')).toBeTruthy()
    expect(screen.getAllByLabelText('Square b2, white king')[0]).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Restart match' }))

    expect(screen.getByText('White to act')).toBeTruthy()
    expect(screen.getByText('No actions yet.')).toBeTruthy()
    expect(screen.getAllByLabelText('Square c1, white king')[0]).toBeTruthy()
  })

  it('allows selecting a rooky, choosing upgrade, and logging the action', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getAllByLabelText('Square a1, white rooky')[0])
    await user.click(screen.getByRole('button', { name: 'Upgrade North' }))

    expect(screen.getByText('Black to act')).toBeTruthy()
    expect(screen.getByText('white-rooky-a upgraded north')).toBeTruthy()
  })

  it('submits highlighted keyboard action with arrows and enter', async () => {
    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

  fireEvent.click(screen.getAllByLabelText('Square a1, white rooky')[0])

  const boardPanel = screen.getByRole('region', { name: 'Game board panel' })
  fireEvent.keyDown(boardPanel, { key: 'ArrowRight' })
  fireEvent.keyDown(boardPanel, { key: 'Enter' })

    expect(screen.getByText('white-rooky-a upgraded north')).toBeTruthy()
    expect(screen.getByText('Black to act')).toBeTruthy()
  })

  it('supports direct board keydown handling and Escape to clear selection', () => {
    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    const boardPanel = screen.getByRole('region', { name: 'Game board panel' })

    fireEvent.keyDown(boardPanel, { key: 'ArrowRight' })
    fireEvent.keyDown(boardPanel, { key: 'Enter' })
    fireEvent.keyDown(boardPanel, { key: 'Tab' })

    expect(screen.getByText('No actions yet.')).toBeTruthy()

    fireEvent.click(screen.getAllByLabelText('Square a1, white rooky')[0])
    fireEvent.keyDown(boardPanel, { key: 'Escape' })

    expect(screen.getByText('No actions yet.')).toBeTruthy()

    fireEvent.click(screen.getAllByLabelText('Square a1, white rooky')[0])
    fireEvent.keyDown(boardPanel, { key: 'Tab' })
    fireEvent.keyDown(boardPanel, { key: 'Enter' })

    expect(screen.queryByText('No actions yet.')).toBeNull()
  })

  it('handles arrow key cycling and Escape to clear selection', async () => {
    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    fireEvent.click(screen.getAllByLabelText('Square a1, white rooky')[0])

    const boardPanel = screen.getByRole('region', { name: 'Game board panel' })
    fireEvent.keyDown(boardPanel, { key: 'ArrowDown' })
    fireEvent.keyDown(boardPanel, { key: 'ArrowLeft' })
    fireEvent.keyDown(boardPanel, { key: 'ArrowUp' })
    fireEvent.keyDown(boardPanel, { key: 'Enter' })

    expect(screen.getByText('Black to act')).toBeTruthy()
    expect(screen.queryByText('No actions yet.')).toBeNull()
  })



  it('allows gridcell enter key activation for square selection and move commit', async () => {
    const user = userEvent.setup()

    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    const fromSquare = screen.getAllByLabelText('Square a1, white rooky')[0]
    fromSquare.focus()
    await user.keyboard('x')
    await user.keyboard('{Enter}')

    const destination = screen.getAllByLabelText('Square a2, empty')[0]
    destination.focus()
    await user.keyboard('{Enter}')

    expect(screen.getByText('white-rooky-a moved to a2')).toBeTruthy()
  })

  it('allows gridcell space key activation for square selection and move commit', async () => {
    const user = userEvent.setup()

    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    const fromSquare = screen.getAllByLabelText('Square a1, white rooky')[0]
    fromSquare.focus()
    await user.keyboard(' ')

    const destination = screen.getAllByLabelText('Square a2, empty')[0]
    destination.focus()
    await user.keyboard(' ')

    expect(screen.getByText('white-rooky-a moved to a2')).toBeTruthy()
  })

  it('renders check, checkmate, and stalemate status messaging from engine state', () => {
    const { rerender } = render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 2, 0),
            rooky('white-rooky-a', 'white', 0, 0),
            king('black-king', 'black', 4, 4),
            rooky('black-rooky-c', 'black', 2, 4, { south: 4 }),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    expect(screen.getByText('White in check')).toBeTruthy()

    rerender(
      <App
        key="checkmate"
        initialGameState={createState(
          [
            king('white-king', 'white', 0, 0),
            king('black-king', 'black', 2, 2),
            rooky('black-rooky-a', 'black', 0, 2, { south: 2 }),
            rooky('black-rooky-b', 'black', 2, 0, { west: 2 }),
            rooky('black-rooky-c', 'black', 2, 1, { west: 2 }),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    expect(screen.getByText('Black wins by checkmate')).toBeTruthy()

    rerender(
      <App
        key="stalemate-no-legal-turn"
        initialGameState={createState(
          [
            king('white-king', 'white', 0, 0),
            king('black-king', 'black', 2, 1),
            rooky('black-rooky-a', 'black', 0, 2, { south: 1 }),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    expect(screen.getByText('Stalemate by no legal turn')).toBeTruthy()

    rerender(
      <App
        key="stalemate-repetition"
        initialGameState={createState(
          [king('white-king', 'white', 0, 0), king('black-king', 'black', 4, 4)],
          {
            activePlayer: 'white',
            recentPlies: [
              {
                player: 'white',
                actionType: 'move',
                stateMoveHash: 'white-repeat',
                wasRepeat: true,
              },
              {
                player: 'black',
                actionType: 'move',
                stateMoveHash: 'black-repeat',
                wasRepeat: true,
              },
            ],
          },
        )}
      />,
    )

    expect(screen.getByText('Stalemate by repetition')).toBeTruthy()
  })

  it('supports UI options and shared reachable-square overlays', async () => {
    const user = userEvent.setup()

    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 2, { east: 2 }),
            king('black-king', 'black', 4, 4),
            rooky('black-rooky-a', 'black', 2, 4, { south: 2 }),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    expect(screen.getAllByLabelText('Square c3, empty')[0].className).toContain('reachable-both')

    await user.click(screen.getByRole('button', { name: 'Yellow vs Red' }))
    expect(screen.getByText('Yellow to act')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'q, w, e, r, t' }))
    expect(screen.getAllByLabelText('Square q3, white rooky')[0]).toBeTruthy()

    await user.click(screen.getByLabelText('Show reachable-square highlighting'))
    expect(screen.getAllByLabelText('Square e3, empty')[0].className.includes('reachable-')).toBe(false)
  })

  it('reverses file axis when row 5 is at the bottom', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Current player at bottom' }))
    await user.click(screen.getAllByLabelText('Square c1, white king')[0])
    await user.click(screen.getAllByLabelText('Square b2, empty')[0])

    const fileAxis = document.querySelector('.board-files')
    const rankAxis = document.querySelector('.board-ranks')

    expect(fileAxis).toBeTruthy()
    expect(rankAxis).toBeTruthy()

    const fileLabels = Array.from(fileAxis!.querySelectorAll('.axis-label')).map(
      (node) => node.textContent,
    )
    const rankLabels = Array.from(rankAxis!.querySelectorAll('.axis-label')).map(
      (node) => node.textContent,
    )

    expect(fileLabels).toEqual(['e', 'd', 'c', 'b', 'a'])
    expect(rankLabels).toEqual(['1', '2', '3', '4', '5'])
  })

  it('keeps row 5 at the bottom when second player is selected at bottom', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Second player at bottom' }))

    const fileAxis = document.querySelector('.board-files')
    const rankAxis = document.querySelector('.board-ranks')

    expect(fileAxis).toBeTruthy()
    expect(rankAxis).toBeTruthy()

    const fileLabels = Array.from(fileAxis!.querySelectorAll('.axis-label')).map(
      (node) => node.textContent,
    )
    const rankLabels = Array.from(rankAxis!.querySelectorAll('.axis-label')).map(
      (node) => node.textContent,
    )

    expect(fileLabels).toEqual(['e', 'd', 'c', 'b', 'a'])
    expect(rankLabels).toEqual(['1', '2', '3', '4', '5'])
  })

  it('rotates rooky corner numerals when board orientation rotates', async () => {
    const user = userEvent.setup()

    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0, {
              north: 1,
              east: 2,
              south: 3,
              west: 4,
            }),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    const rookySquare = screen.getAllByLabelText('Square a1, white rooky')[0]
    const getDisplayedRanges = () =>
      Array.from(rookySquare.querySelectorAll('.range-numeral')).map(
        (node) => node.textContent,
      )

    expect(getDisplayedRanges()).toEqual(['1', '2', '3', '4'])

    await user.click(screen.getByRole('button', { name: 'Second player at bottom' }))

    expect(getDisplayedRanges()).toEqual(['3', '4', '1', '2'])
  })

  it('rotates on-piece upgrade chip positions when board orientation rotates', async () => {
    const user = userEvent.setup()

    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    await user.click(screen.getAllByLabelText('Square a1, white rooky')[0])

    expect(screen.getByRole('button', { name: 'Upgrade North' }).className).toContain('upgrade-north')
    expect(screen.getByRole('button', { name: 'Upgrade East' }).className).toContain('upgrade-east')
    expect(screen.getByRole('button', { name: 'Upgrade South' }).className).toContain('upgrade-south')
    expect(screen.getByRole('button', { name: 'Upgrade West' }).className).toContain('upgrade-west')

    await user.click(screen.getByRole('button', { name: 'Second player at bottom' }))
    await user.click(screen.getAllByLabelText('Square a1, white rooky')[0])

    expect(screen.getByRole('button', { name: 'Upgrade North' }).className).toContain('upgrade-south')
    expect(screen.getByRole('button', { name: 'Upgrade East' }).className).toContain('upgrade-west')
    expect(screen.getByRole('button', { name: 'Upgrade South' }).className).toContain('upgrade-north')
    expect(screen.getByRole('button', { name: 'Upgrade West' }).className).toContain('upgrade-east')
  })

  it('supports explicit move selection from the target list and restart reset', async () => {
    const user = userEvent.setup()

    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    await user.click(screen.getAllByLabelText('Square a1, white rooky')[0])
    await user.click(screen.getAllByLabelText('Square a2, empty')[0])

    expect(screen.getByText('white-rooky-a moved to a2')).toBeTruthy()
    expect(screen.getByText('Black to act')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Restart match' }))

    expect(screen.getByText('White to act')).toBeTruthy()
    expect(screen.getByText('No actions yet.')).toBeTruthy()
    expect(screen.getAllByLabelText('Square a1, white rooky')[0]).toBeTruthy()
  })

  it('ignores empty-square presses, inactive actionless pieces, and invalid move targets', async () => {
    const user = userEvent.setup()

    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 2, 0),
            rooky('white-rooky-a', 'white', 0, 0),
            king('black-king', 'black', 4, 4),
            rooky('black-rooky-c', 'black', 2, 4, { south: 4 }),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    await user.click(screen.getAllByLabelText('Square a3, empty')[0])
    expect(screen.getByText('No actions yet.')).toBeTruthy()

    await user.click(screen.getAllByLabelText('Square a1, white rooky')[0])
    expect(screen.getByText('No actions yet.')).toBeTruthy()

    await user.click(screen.getAllByLabelText('Square c1, white king')[0])
    await user.click(screen.getAllByLabelText('Square a3, empty')[0])

    expect(screen.getByText('White to act')).toBeTruthy()
    expect(screen.getByText('No actions yet.')).toBeTruthy()
  })

  it('ignores opposing-piece selection attempts on the active turn', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getAllByLabelText('Square a5, black rooky')[0])

    expect(screen.getByText('White to act')).toBeTruthy()
    expect(screen.getByText('No actions yet.')).toBeTruthy()
  })

  it('logs capture details when a move takes an opposing piece', async () => {
    const user = userEvent.setup()

    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0, { east: 2 }),
            rooky('black-rooky-target', 'black', 2, 0),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    await user.click(screen.getAllByLabelText('Square a1, white rooky')[0])
    await user.click(screen.getAllByLabelText('Square c1, black rooky')[0])

    expect(screen.getByText('white-rooky-a moved to c1, capturing black-rooky-target')).toBeTruthy()
    expect(screen.getAllByLabelText('Square c1, white rooky')[0]).toBeTruthy()
  })
  it('supports selecting by typed coordinates and committing with enter', () => {
    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    const boardPanel = screen.getByRole('region', { name: 'Game board panel' })

    // Select white rooky at a1 via coordinate typing.
    fireEvent.keyDown(boardPanel, { key: 'a' })
    fireEvent.keyDown(boardPanel, { key: '1' })

    // Commit first available action with enter.
    fireEvent.keyDown(boardPanel, { key: 'Enter' })

    expect(screen.getByText('Black to act')).toBeTruthy()
    expect(screen.queryByText('No actions yet.')).toBeNull()
  })

  it('ignores coordinate typing for empty squares or enemy pieces', () => {
    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    const boardPanel = screen.getByRole('region', { name: 'Game board panel' })

    // Try selecting empty square
    fireEvent.keyDown(boardPanel, { key: 'c' })
    fireEvent.keyDown(boardPanel, { key: '3' })
    expect(screen.getByText('No actions yet.')).toBeTruthy()

    // Try selecting enemy piece
    fireEvent.keyDown(boardPanel, { key: 'e' })
    fireEvent.keyDown(boardPanel, { key: '5' })
    expect(screen.getByText('No actions yet.')).toBeTruthy()
  })

  it('ignores enemy selection in rank-file coordinate order', () => {
    render(<App />)

    const boardPanel = screen.getByRole('region', { name: 'Game board panel' })

    // 5e maps to black rooky on e5 for the initial position when using rank-file input.
    fireEvent.keyDown(boardPanel, { key: '5' })
    fireEvent.keyDown(boardPanel, { key: 'e' })

    expect(screen.getByText('White to act')).toBeTruthy()
    expect(screen.getByText('No actions yet.')).toBeTruthy()
  })

  it('clears coordinate buffer with escape during coordinate entry', () => {
    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    const boardPanel = screen.getByRole('region', { name: 'Game board panel' })

    // Type 'a' and then escape
    fireEvent.keyDown(boardPanel, { key: 'a' })
    fireEvent.keyDown(boardPanel, { key: 'Escape' })

    // If buffer was cleared, no piece should be selected
    expect(screen.getByText('No actions yet.')).toBeTruthy()
  })
  it('persists game state to localStorage and restores it on remount', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.click(screen.getAllByLabelText('Square c1, white king')[0])
    await user.click(screen.getAllByLabelText('Square b2, empty')[0])

    expect(screen.getByText('Black to act')).toBeTruthy()

    unmount()
    render(<App />)

    expect(screen.getByText('Black to act')).toBeTruthy()
    expect(screen.getAllByLabelText('Square b2, white king')[0]).toBeTruthy()
  })

  it('falls back to fresh state when saved game state data is corrupted', () => {
    localStorage.setItem('rookys-game-state', 'not valid json')
    render(<App />)

    expect(screen.getByText('White to act')).toBeTruthy()
    expect(screen.getByText('No actions yet.')).toBeTruthy()
  })

  it('falls back to empty log when saved action log data is corrupted', () => {
    localStorage.setItem('rookys-action-log', 'not valid json')
    render(<App />)

    expect(screen.getByText('White to act')).toBeTruthy()
    expect(screen.getByText('No actions yet.')).toBeTruthy()
  })

  it('handles keyboard coordinates mixed with arrow keys and entry', () => {
    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0, { north: 2 }),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'white' },
        )}
      />,
    )

    const boardPanel = screen.getByRole('region', { name: 'Game board panel' })

    // Select via rank-file order, then cycle and commit.
    fireEvent.keyDown(boardPanel, { key: '1' })
    fireEvent.keyDown(boardPanel, { key: 'a' })
    fireEvent.keyDown(boardPanel, { key: 'ArrowRight' })
    fireEvent.keyDown(boardPanel, { key: 'Enter' })

    expect(screen.getByText('Black to act')).toBeTruthy()
  })
})

// ── PeerJS mock shared for multiplayer tests ─────────────────────────────────

interface MockConn {
  peer: string
  on: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}

interface MockPeer {
  on: ReturnType<typeof vi.fn>
  connect: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

let mockPeer: MockPeer
let mockIncomingConn: MockConn

const { AppMockPeer } = vi.hoisted(() => ({ AppMockPeer: vi.fn() }))

vi.mock('peerjs', () => ({ default: AppMockPeer }))

function setupPeerMock() {
  mockIncomingConn = {
    peer: 'remote-peer',
    on: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
  }
  mockPeer = {
    on: vi.fn(),
    connect: vi.fn().mockReturnValue(mockIncomingConn),
    destroy: vi.fn(),
  }
  AppMockPeer.mockImplementation(function () { return mockPeer })
}

function triggerPeerEvent(event: string, ...args: unknown[]) {
  const calls = mockPeer.on.mock.calls as [string, (...a: unknown[]) => void][]
  calls.filter(([e]) => e === event).forEach(([, h]) => h(...args))
}

function triggerConnEvent(conn: MockConn, event: string, ...args: unknown[]) {
  const calls = conn.on.mock.calls as [string, (...a: unknown[]) => void][]
  calls.filter(([e]) => e === event).forEach(([, h]) => h(...args))
}

describe('App – multiplayer', () => {
  it('shows Host Game button when not active', () => {
    setupPeerMock()
    render(<App />)

    expect(screen.getByRole('button', { name: 'Host Game' })).toBeTruthy()
  })

  it('host game flow: button click → waiting message → share link when peer id assigned', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))

    expect(screen.getByText('Setting up connection…')).toBeTruthy()

    act(() => triggerPeerEvent('open', 'my-peer-id'))

    expect(screen.getByText('Waiting for opponent to join…')).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Share link' })).toBeTruthy()
  })

  it('host game: shows connected message when opponent connects', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))
    act(() => triggerPeerEvent('open', 'my-peer-id'))
    act(() => triggerPeerEvent('connection', mockIncomingConn))
    act(() => triggerConnEvent(mockIncomingConn, 'open'))

    expect(screen.getByText('Opponent connected.')).toBeTruthy()
  })

  it('leave game destroys session and returns to idle state', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))
    act(() => triggerPeerEvent('open', 'my-peer-id'))

    await user.click(screen.getByRole('button', { name: 'Leave Game' }))

    expect(mockPeer.destroy).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Host Game' })).toBeTruthy()
  })

  it('restart button is disabled while multiplayer is active', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))

    const restart = screen.getByRole('button', { name: 'Restart match' })
    expect(restart.matches(':disabled')).toBe(true)
  })

  it('host cannot select or move black pieces', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    render(
      <App
        initialGameState={createState(
          [
            king('white-king', 'white', 4, 0),
            rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
            king('black-king', 'black', 4, 4),
          ],
          { activePlayer: 'black' },
        )}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Host Game' }))
    act(() => triggerPeerEvent('open', 'my-peer-id'))
    act(() => triggerPeerEvent('connection', mockIncomingConn))
    act(() => triggerConnEvent(mockIncomingConn, 'open'))

    // It's black's turn but host is white — cannot select black king
    await user.click(screen.getAllByLabelText('Square e5, black king')[0])
    expect(screen.getByText('Black to act')).toBeTruthy()
    expect(screen.getByText('No actions yet.')).toBeTruthy()
  })

  it('host applies valid remote upgrade action from joiner', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    const initialState = createState(
      [
        king('white-king', 'white', 4, 0),
        rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
        king('black-king', 'black', 4, 4),
        rooky('black-rooky-a', 'black', 0, 4),
      ],
      { activePlayer: 'white' },
    )
    render(<App initialGameState={initialState} />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))
    act(() => triggerPeerEvent('open', 'my-peer-id'))
    act(() => triggerPeerEvent('connection', mockIncomingConn))
    act(() => triggerConnEvent(mockIncomingConn, 'open'))

    // Host takes white's turn first
    await user.click(screen.getAllByLabelText('Square a1, white rooky')[0])
    await user.click(screen.getAllByLabelText('Square a2, empty')[0])
    expect(screen.getByText('Black to act')).toBeTruthy()

    // Joiner sends black rooky upgrade (type !== 'move' → capturedPiece = undefined)
    act(() => triggerConnEvent(mockIncomingConn, 'data', {
      type: 'action',
      actionId: 'upgrade-1',
      turn: 2,
      payload: { type: 'upgrade', pieceId: 'black-rooky-a', direction: 'south' },
    }))

    expect(screen.getByText('White to act')).toBeTruthy()
  })

  it('host applies valid remote action from joiner (black)', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    const initialState = createState(
      [
        king('white-king', 'white', 4, 0),
        rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
        king('black-king', 'black', 4, 4),
      ],
      { activePlayer: 'white' },
    )
    render(<App initialGameState={initialState} />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))
    act(() => triggerPeerEvent('open', 'my-peer-id'))
    act(() => triggerPeerEvent('connection', mockIncomingConn))
    act(() => triggerConnEvent(mockIncomingConn, 'open'))

    // Host takes white's turn first
    await user.click(screen.getAllByLabelText('Square a1, white rooky')[0])
    await user.click(screen.getAllByLabelText('Square a2, empty')[0])
    expect(screen.getByText('Black to act')).toBeTruthy()

    // Joiner sends a black king move (ply = 2, after white moved)
    act(() => triggerConnEvent(mockIncomingConn, 'data', {
      type: 'action',
      actionId: 'envelope-1',
      turn: 2,
      payload: { type: 'move', pieceId: 'black-king', to: { file: 4, rank: 3 } },
    }))

    expect(screen.getByText('White to act')).toBeTruthy()
  })

  it('host sends sync when remote action has wrong turn', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))
    act(() => triggerPeerEvent('open', 'my-peer-id'))
    act(() => triggerPeerEvent('connection', mockIncomingConn))
    act(() => triggerConnEvent(mockIncomingConn, 'open'))

    // Send action with wrong turn number
    act(() => triggerConnEvent(mockIncomingConn, 'data', {
      type: 'action',
      actionId: 'bad-turn',
      turn: 999,
      payload: { type: 'move', pieceId: 'white-king', to: { file: 1, rank: 1 } },
    }))

    expect(mockIncomingConn.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sync' }),
    )
  })

  it('sync received replaces game state', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))
    act(() => triggerPeerEvent('open', 'my-peer-id'))
    act(() => triggerPeerEvent('connection', mockIncomingConn))
    act(() => triggerConnEvent(mockIncomingConn, 'open'))

    const syncedState = createState(
      [
        king('white-king', 'white', 0, 0),
        king('black-king', 'black', 4, 4),
      ],
      { activePlayer: 'black' },
    )

    act(() => triggerConnEvent(mockIncomingConn, 'data', { type: 'sync', state: syncedState }))

    expect(screen.getByText('Black to act')).toBeTruthy()
  })

  it('deduplicates remote actions with the same actionId', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    const initialState = createState(
      [
        king('white-king', 'white', 4, 0),
        rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
        king('black-king', 'black', 4, 4),
      ],
      { activePlayer: 'white' },
    )
    render(<App initialGameState={initialState} />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))
    act(() => triggerPeerEvent('open', 'my-peer-id'))
    act(() => triggerPeerEvent('connection', mockIncomingConn))
    act(() => triggerConnEvent(mockIncomingConn, 'open'))

    // White moves first
    await user.click(screen.getAllByLabelText('Square a1, white rooky')[0])
    await user.click(screen.getAllByLabelText('Square a2, empty')[0])

    const envelope = {
      type: 'action' as const,
      actionId: 'dup-id',
      turn: 2,
      payload: { type: 'move' as const, pieceId: 'black-king', to: { file: 4, rank: 3 } },
    }

    act(() => triggerConnEvent(mockIncomingConn, 'data', envelope))
    act(() => triggerConnEvent(mockIncomingConn, 'data', envelope)) // duplicate

    // Only 2 actions logged (white move + black move, not 3)
    const logItems = screen.getAllByRole('listitem')
    expect(logItems).toHaveLength(2)
  })

  it('auto-joins from initialSearchParams', () => {
    setupPeerMock()
    render(<App initialSearchParams="?join=host-peer-id" />)

    expect(AppMockPeer).toHaveBeenCalled()
    expect(screen.getByText('Setting up connection…')).toBeTruthy()
  })

  it('peer-disconnected status shown when connection is lost permanently', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))
    act(() => triggerPeerEvent('open', 'my-peer-id'))
    act(() => triggerPeerEvent('connection', mockIncomingConn))
    act(() => triggerConnEvent(mockIncomingConn, 'open'))
    act(() => triggerConnEvent(mockIncomingConn, 'error'))

    expect(screen.getByText('Opponent disconnected.')).toBeTruthy()
  })

  it('joiner applies remote action from host (white)', async () => {
    setupPeerMock()
    render(<App initialSearchParams="?join=host-id" />)

    act(() => triggerPeerEvent('open', 'my-joiner-id'))
    act(() => triggerConnEvent(mockIncomingConn, 'open'))

    // Host sends white king move (ply 1)
    act(() => triggerConnEvent(mockIncomingConn, 'data', {
      type: 'action',
      actionId: 'remote-action-1',
      turn: 1,
      payload: { type: 'move', pieceId: 'white-king', to: { file: 1, rank: 1 } },
    }))

    expect(screen.getByText('Black to act')).toBeTruthy()
  })

  it('joiner receives sync from host and updates state', async () => {
    setupPeerMock()
    render(<App initialSearchParams="?join=host-id" />)

    act(() => triggerPeerEvent('open', 'my-joiner-id'))
    act(() => triggerConnEvent(mockIncomingConn, 'open'))

    const syncedState = createState(
      [king('white-king', 'white', 0, 0), king('black-king', 'black', 4, 4)],
      { activePlayer: 'black' },
    )

    act(() => triggerConnEvent(mockIncomingConn, 'data', { type: 'sync', state: syncedState }))

    expect(screen.getByText('Black to act')).toBeTruthy()
  })

  it('joiner ignores remote action with wrong turn (no sync sent from joiner)', async () => {
    setupPeerMock()
    render(<App initialSearchParams="?join=host-id" />)

    act(() => triggerPeerEvent('open', 'my-joiner-id'))
    act(() => triggerConnEvent(mockIncomingConn, 'open'))

    // Wrong turn — joiner does not send sync (only host does)
    act(() => triggerConnEvent(mockIncomingConn, 'data', {
      type: 'action',
      actionId: 'wrong-turn',
      turn: 999,
      payload: { type: 'move', pieceId: 'white-king', to: { file: 1, rank: 1 } },
    }))

    // State unchanged: still white's turn
    expect(screen.getByText('White to act')).toBeTruthy()
    // Joiner does NOT send sync (unlike host)
    expect(mockIncomingConn.send).not.toHaveBeenCalled()
  })

  it('peer id callbacks are no-ops when multiplayer becomes inactive before firing', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))

    // Leave before peer id fires
    await user.click(screen.getByRole('button', { name: 'Leave Game' }))

    // Callbacks fire after leave — should silently no-op
    act(() => triggerPeerEvent('open', 'late-peer-id'))

    // Should be back to idle state (not active)
    expect(screen.getByRole('button', { name: 'Host Game' })).toBeTruthy()
  })

  it('joiner auto-join callbacks are no-ops when leave fires before peer open', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    // Auto-join: multiplayer becomes active (joiner/idle) synchronously
    render(<App initialSearchParams="?join=some-host-id" />)

    // Status=idle so "Leave Game" button is shown; leave before peer assigns id
    await user.click(screen.getByRole('button', { name: 'Leave Game' }))

    // Now fire auto-join callbacks → prev.active is false → no-ops
    act(() => triggerPeerEvent('open', 'late-joiner-id'))

    expect(screen.getByRole('button', { name: 'Host Game' })).toBeTruthy()
  })

  it('commitAction is a no-op when piece no longer exists (captured via sync before commit)', async () => {
    // Covers the !movingPiece guard branch in commitAction (line 296 defense-in-depth)
    setupPeerMock()
    const user = userEvent.setup()
    const initialState = createState(
      [
        king('white-king', 'white', 4, 0),
        rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
        king('black-king', 'black', 4, 4),
      ],
      { activePlayer: 'white' },
    )
    render(<App initialGameState={initialState} />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))
    act(() => triggerPeerEvent('open', 'my-peer-id'))
    act(() => triggerPeerEvent('connection', mockIncomingConn))
    act(() => triggerConnEvent(mockIncomingConn, 'open'))

    // Select white rooky
    await user.click(screen.getAllByLabelText('Square a1, white rooky')[0])

    // Receive sync that removes white rooky from the board
    const syncedState = createState(
      [king('white-king', 'white', 4, 0), king('black-king', 'black', 4, 4)],
      { activePlayer: 'white' },
    )
    act(() => triggerConnEvent(mockIncomingConn, 'data', { type: 'sync', state: syncedState }))

    // Keyboard Enter — selection was cleared by sync resetSelection, so nothing happens
    const boardPanel = screen.getByRole('region', { name: 'Game board panel' })
    fireEvent.keyDown(boardPanel, { key: 'Enter' })

    expect(screen.getByText('No actions yet.')).toBeTruthy()
  })

  it('replaces window history when auto-joining from real URL (no initialSearchParams)', () => {
    setupPeerMock()
    const replaceState = vi.spyOn(window.history, 'replaceState')
    // Simulate a URL with ?join= by setting window.location.search via jsdom
    // jsdom doesn't allow direct assignment but we can verify replaceState is called
    // When initialSearchParams is undefined and there's a join param, replaceState fires.
    // We use a wrapper: render with undefined, and fake window.location.search by using
    // Object.defineProperty just for this test.
    const originalSearch = window.location.search
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, search: '?join=some-host', pathname: '/' },
    })
    render(<App />)
    expect(replaceState).toHaveBeenCalledWith(null, '', '/')
    // restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, search: originalSearch },
    })
    replaceState.mockRestore()
  })

  it('commitAction ignores moves for opponent pieces when local role is host', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    const initialState = createState(
      [
        king('white-king', 'white', 4, 0),
        rooky('white-rooky-a', 'white', 0, 0, { north: 1 }),
        king('black-king', 'black', 4, 4),
      ],
      { activePlayer: 'black' },
    )
    render(<App initialGameState={initialState} />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))
    act(() => triggerPeerEvent('open', 'my-peer-id'))
    act(() => triggerPeerEvent('connection', mockIncomingConn))
    act(() => triggerConnEvent(mockIncomingConn, 'open'))

    // Black king can theoretically be clicked as a square, but host is white
    // Try clicking black king (should be blocked by handlePieceSelection guard)
    await user.click(screen.getAllByLabelText('Square e5, black king')[0])
    expect(screen.getByText('No actions yet.')).toBeTruthy()
  })

  it('focuses share-url-input and selects text on focus', async () => {
    setupPeerMock()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Host Game' }))
    act(() => triggerPeerEvent('open', 'my-peer-id'))

    const input = screen.getByRole('textbox', { name: 'Share link' }) as HTMLInputElement
    const selectSpy = vi.spyOn(input, 'select')
    await user.click(input)

    expect(selectSpy).toHaveBeenCalled()
    selectSpy.mockRestore()
  })
})

describe('MultiplayerPanel', () => {
  it('renders empty string when active=true and status=null', () => {
    render(
      <MultiplayerPanel
        active={true}
        role="host"
        status={null}
        localPeerId={null}
        shareUrl={null}
        onHostGame={() => {}}
        onLeaveMultiplayer={() => {}}
      />,
    )
    // The connection-message paragraph should render but be empty
    const msg = document.querySelector('.connection-message')
    expect(msg?.textContent).toBe('')
  })
})