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
    expect(screen.getByRole('region', { name: 'Board keyboard controls' })).toBeTruthy()
    expect(screen.getByLabelText('Keyboard square selection')).toBeTruthy()
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

  it('supports keyboard square selection in file-rank and rank-file order', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.type(screen.getByLabelText('Keyboard square selection'), 'c1')
    await user.click(screen.getByRole('button', { name: 'Select square' }))

    expect(screen.getByText(/Selected piece: White king/i)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'q, w, e, r, t' }))
    await user.click(screen.getByRole('button', { name: 'Rank then file' }))
    await user.click(screen.getByRole('button', { name: 'File then rank' }))
    await user.click(screen.getByRole('button', { name: 'Rank then file' }))
    await user.clear(screen.getByLabelText('Keyboard square selection'))
    await user.type(screen.getByLabelText('Keyboard square selection'), '1q')
    await user.click(screen.getByRole('button', { name: 'Select square' }))

    expect(screen.getByText(/Selected piece: White rooky/i)).toBeTruthy()
  })

  it('submits highlighted keyboard action with arrows and enter', async () => {
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

    const keyboardRegion = screen.getByRole('region', { name: 'Board keyboard controls' })
    await user.click(keyboardRegion)
    await user.keyboard('{ArrowRight}{Enter}')

    expect(screen.getByText('white-rooky-a upgraded north')).toBeTruthy()
    expect(screen.getByText('Black to act')).toBeTruthy()
  })

  it('supports direct keyboard-region keydown handling', () => {
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

    const keyboardRegion = screen.getByRole('region', { name: 'Board keyboard controls' })

    fireEvent.keyDown(keyboardRegion, { key: 'ArrowRight' })
    fireEvent.keyDown(keyboardRegion, { key: 'Enter' })
    fireEvent.keyDown(keyboardRegion, { key: 'Tab' })

    expect(screen.getByText('No actions yet.')).toBeTruthy()

    fireEvent.click(screen.getAllByLabelText('Square a1, white rooky')[0])
    fireEvent.keyDown(keyboardRegion, { key: 'Tab' })
    fireEvent.keyDown(keyboardRegion, { key: 'Enter' })

    expect(screen.queryByText('No actions yet.')).toBeNull()
  })

  it('handles alternate arrow keys and ignores keyboard action when input is focused', async () => {
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

    const keyboardRegion = screen.getByRole('region', { name: 'Board keyboard controls' })
    await user.click(keyboardRegion)
    await user.keyboard('{ArrowDown}{ArrowLeft}{ArrowUp}{Enter}')

    expect(screen.getByText('Black to act')).toBeTruthy()
    expect(screen.queryByText('No actions yet.')).toBeNull()

    await user.click(screen.getByLabelText('Keyboard square selection'))
    await user.keyboard('{Enter}')

    expect(screen.getByText('Black to act')).toBeTruthy()
  })

  it('ignores invalid keyboard square input values', async () => {
    const user = userEvent.setup()

    render(<App />)

    const input = screen.getByLabelText('Keyboard square selection')

    await user.type(input, 'y9')
    await user.click(screen.getByRole('button', { name: 'Select square' }))
    expect(screen.getByText(/Selected piece: none/i)).toBeTruthy()

    await user.clear(input)
    await user.type(input, 'c')
    await user.click(screen.getByRole('button', { name: 'Select square' }))
    expect(screen.getByText(/Selected piece: none/i)).toBeTruthy()

    await user.clear(input)
    await user.type(input, 'c1')
    await user.click(screen.getByRole('button', { name: 'Select square' }))
    expect(screen.getByText(/Selected piece: White king/i)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(screen.getByText(/Selected piece: none/i)).toBeTruthy()
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
    expect(screen.getByText(/Selected piece: none/i)).toBeTruthy()

    await user.click(screen.getAllByLabelText('Square a1, white rooky')[0])
    expect(screen.getByText(/Selected piece: none/i)).toBeTruthy()

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
    expect(screen.getByText(/Selected piece: none/i)).toBeTruthy()
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
})