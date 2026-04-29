import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'
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