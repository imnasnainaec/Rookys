# ROOKYS_RULES

Rigorous, user-readable rules specification for the game Rookys ("in which Rooks learn to be Rooks").

## 1. Purpose and Win Condition

Rookys is a two-player abstract strategy game played on a board. The objective is to win by checkmating the opponent's King.

A player wins immediately when, at the start of that player's turn evaluation, the opponent's King is in check and the opponent has no legal turn (no legal move and no legal upgrade).

## 2. Core Terms

- Board: The rectangular grid of squares used for play.
- Square: One cell of the board, identified by rank and file.
- File: A vertical column (Chess terminology).
- Rank: A horizontal row (Chess terminology).
- Piece: A game unit (King or Rooky in classic mode).
- Friendly piece: A piece controlled by the current player.
- Opponent piece: A piece controlled by the other player.
- Capture: Moving onto a square occupied by an opponent piece; the opponent piece is removed.
- Turn: Exactly one action by the active player: either a move or an upgrade.
- Check: A state where the King can be captured by at least one opponent piece in one legal move from the current position.
- Legal turn: A turn that follows all movement and game-state legality rules, including king safety.

## 3. Classic Board and Initial Position

### 3.1 Board Size

Classic mode uses a 5x5 board.

### 3.2 Starting Pieces Per Side

Each side starts with:

- 1 King
- 4 Rookys

### 3.3 Starting Arrangement

Each side has one home rank on opposite board edges.

- The King starts on the middle file of that side's home rank.
- The 4 Rookys start on the other 4 files of that same home rank.

Example (files a-e): if a home rank is rank 1, the King starts on c1 and Rookys on a1, b1, d1, e1.

## 4. Piece Behavior (Classic)

## 4.1 King

Unless a variant overrides King movement, the King moves one square to any adjacent square (orthogonal or diagonal), consistent with standard Chess king movement.

King movement still follows normal occupancy rules:

- It cannot move onto a square occupied by a friendly piece.
- It may capture an opponent piece by landing on that piece's square.
- It may not end a turn in check.

## 4.2 Rooky

A Rooky uses directional range values for four orthogonal directions:

- North
- South
- East
- West

At game start, all four directional ranges are 0 for every Rooky.

Consequence: at start, Rookys cannot move.

A Rooky move is orthogonal only. In a chosen direction, it may move any number of squares from 1 up to its current range in that direction, subject to path and occupancy rules.

## 5. Turn Structure

On each turn, the active player must choose exactly one of:

- Move action
- Upgrade action

No pass action exists in classic rules.

## 6. Move Action Rules

A move action selects one friendly piece and a legal destination square.

Move legality requirements:

- The movement pattern must be valid for that piece type.
- The piece cannot jump over any piece.
- The destination square cannot contain a friendly piece.
- If the destination square contains an opponent piece, that piece is captured.
- After completing the move, the moving player's King must not be in check.

If a candidate move violates any requirement above, it is illegal.

## 7. Upgrade Action Rules

An upgrade action applies only to a friendly Rooky.

Upgrade procedure:

- Select one friendly Rooky.
- Select one of its four orthogonal directions.
- Permanently increase that direction's movement range by 1.

Upgrade legality requirements:

- The action must leave the player's King not in check at end of turn.

Important repetition interaction:

- When any upgrade occurs, previously tracked repetition state-move history becomes irrelevant and may be cleared.

## 8. Check, Checkmate, and Stalemate

## 8.1 Check

A King is in check if at least one opponent piece could capture it in one legal move from the current board state.

## 8.2 Illegal King Exposure

A player may not make a move or upgrade that results in their own King being in check at turn end.

## 8.3 Checkmate (Lose Condition)

A player is checkmated (and loses) when both are true:

- Their King is in check.
- They have no legal turn (no legal move and no legal upgrade).

## 8.4 Stalemate Condition 1

A stalemate draw occurs when both are true:

- The active player's King is not in check.
- The active player has no legal turn (no legal move and no legal upgrade).

## 8.5 Stalemate Condition 2 (Repeated State-Move Pattern)

A stalemate draw occurs on repeated non-upgrade play when all of the following hold:

- Two consecutive turns are move actions (no upgrades), one by each player.
- On each of those two turns, the player's state+move combination matches one of that same player's previously recorded state+move combinations.

Implementation guidance from source rule:

- Track a hash of state+move combinations.
- Clear the hash cache when an upgrade occurs.

Practical reading: this condition detects a repeated two-ply cycle of previously seen non-upgrade turns.

## 9. Determinism and State Equivalence (for Repetition)

For repetition checks, "same state" should be treated as exact game-state equivalence under the active ruleset, including at least:

- Piece identities/types/owners and exact square positions
- Per-piece upgrade values

"Same move" should be treated as identical action semantics from that state (same piece, origin, destination, and capture outcome for moves).

## 10. Classic Mode Defaults Summary

- Board is 5x5.
- Each side has 1 King + 4 Rookys on its home rank.
- Each Rooky starts with 0 range in all four orthogonal directions.
- Turn options: move or upgrade.
- No jumping through pieces.
- Friendly-square landing is illegal.
- Capture by displacement.
- Self-check is illegal.
- Win by checkmate.
- Draw by a stalemate condition.

## 11. Variant Framework

## 11.1 Custom Board Dimensions

- Square boards: NxN
- Rectangular boards: NxM

## 11.2 Custom Rooky Arrangement

- Custom number of Rookys (R)
- Custom Rooky positions
- Placement modes: random from king vs fully random vs manual
- Symmetry modes: mirrored vs non-mirrored
- Placement restriction: limited to n rows and m columns from the King

## 11.3 Custom King Configuration

- Custom King positions
- Position modes: corners vs random vs manual
- Side mapping modes: mirrored vs reversed vs any

## 11.4 Bishy Piece

- Bishy moves diagonally instead of laterally
- Supports the same variant customization families as Rookys

## 11.5 Queeny Piece

- Queeny moves laterally and diagonally
- Supports the same variant customization families as Rookys

## 11.6 Shrinking Board

At the start of each turn, permanently remove inactive edge ranks/files.

Modes:

- Chill: inactive means unreachable by any piece in one move
- Aggressive: inactive means unoccupied
