# No changes needed to the python script logic, just updating the content variable
plan_content = """# Master Implementation Plan: Rookys (P2P + AI)
**Stack:** React + Redux Toolkit + TypeScript + PeerJS + TensorFlow.js

## Phase 1: Project Scaffolding & Infrastructure
1. **Setup:** Initialize Vite with `react-ts`. Install `@reduxjs/toolkit`, `peerjs`, `@tensorflow/tfjs`, and `nanoid`.
2. **Hosting Setup:** Configure `vite.config.ts` with the correct `base` path for GitHub Pages deployment.

## Phase 2: The Rookys Engine (Redux Store)
1. **State Schema:**
   - `board`: 2D array of Piece objects.
   - `Piece`: `{ id, owner, type: 'Rooky' | 'King', pos: [x,y], upgrades: { n, s, e, w } }`.
   - `history`: Array of hashes (State + Last Move) for Stalemate Condition 2.
2. **Core Reducers:**
   - `movePiece`: Validates movement based on piece capabilities. Captures opponent pieces. Appends to `history`.
   - `upgradePiece`: Increments a cardinal direction range. **Crucial:** Must clear the `history` array.
3. **Win/Draw Logic:** Functions to detect Checkmate (King in check + no valid turns) and Stalemate (Condition 1: No turns; Condition 2: Repeated state-move combo).

## Phase 3: Game UI
1. **Dynamic UI:** Implement a two-phase selection (Select piece -> Choose "Move" or "Upgrade").

## Phase 4: P2P Multiplayer Integration
1. **Connection Logic:** Use PeerJS for WebRTC signaling.
2. **The "Share Code" Flow:**
   - Host generates a 6-character ID.
   - App appends `?join=ID` to the URL for sharing.
   - Joiner reads URL params on load and initiates the handshake.
3. **Action Syncing:** - Every local dispatch is intercepted and sent via `dataConnection.send()`.
   - Incoming peer actions are dispatched to the local store to keep states mirrored.

## Phase 5: Deployment (GitHub Pages)
1. Set `base` in `vite.config.ts` to `/[repo-name]/`.
2. Use `gh-pages` package or GitHub Actions to deploy the `dist/` folder.
3. **Important:** Ensure the PeerJS server is set to the default or a free public broker.

## Phase 6: AI Development (TensorFlow.js)
1. **Model Architecture:**
   - **Input:** 3D Tensor representing piece positions AND upgrade levels (e.g., [BoardWidth, BoardHeight, 10 Channels]).
   - **Training:** Conducted on Windows 11 using Python/Keras. Simulate self-play to value "Upgrades" vs. "Moves."
2. **Browser Inference:** Load the converted `model.json` from the `/public` folder. Run inference in a Web Worker to prevent UI lag.

## Phase 7: Game Variants
1. **Variant Engine:** Support for Custom Dimensions, Shrinking Boards (start-of-turn check), Reincarnation, and Bishys.
2. Simple variants UI with a few standard variants (e.g., NxN board, King center vs corner)
3. Advanced variant customization UI with more fine-tuned settings (e.g., NxM board, King center vs corner vs random vs manual, opponents mirrored vs reversed vs independent)

## Instructions for AI Agent
> \"Follow this plan sequentially. Start by defining the TypeScript interfaces for the Rookys game state. Ensure the `movePiece` logic strictly follows the 'no jumping' and 'cardinal range' rules. The P2P hook should be the second priority once the local game is playable.\"