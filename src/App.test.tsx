import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

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

afterEach(() => {
  cleanup()
})

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

    expect(screen.getByRole('button', { name: 'Choose move' }).getAttribute('data-active')).toBe(
      'true',
    )

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
    await user.click(screen.getByRole('button', { name: 'Choose upgrade' }))
    await user.click(screen.getByRole('button', { name: 'North' }))

    expect(screen.getByText('Black to act')).toBeTruthy()
    expect(screen.getByText('white-rooky-a upgraded north')).toBeTruthy()
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
    await user.click(screen.getByRole('button', { name: 'Choose move' }))
    await user.click(screen.getByRole('button', { name: 'a2' }))

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
    expect(screen.getByText('Select an active piece to continue')).toBeTruthy()

    await user.click(screen.getAllByLabelText('Square a1, white rooky')[0])
    expect(screen.getByText('Select an active piece to continue')).toBeTruthy()

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
    expect(screen.getByText('Select an active piece to continue')).toBeTruthy()
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
    await user.click(screen.getByRole('button', { name: 'Choose move' }))
    await user.click(screen.getByRole('button', { name: 'c1' }))

    expect(screen.getByText('white-rooky-a moved to c1, capturing black-rooky-target')).toBeTruthy()
    expect(screen.getAllByLabelText('Square c1, white rooky')[0]).toBeTruthy()
  })
})