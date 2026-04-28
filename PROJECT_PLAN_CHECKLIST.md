# PROJECT_PLAN_CHECKLIST

Last updated: 2026-04-28
Canonical source of truth for implementation progress and session resume.

## Legend

- [ ] Not started
- [~] In progress
- [x] Completed
- Gate status: Pending | Approved | Approved with follow-ups | Rejected

## Phase 0 - Governance, repository bootstrap, and legal foundation

Gate G0 status: Approved

- [x] Create AGENTS.md in repo root as the first artifact.
- [x] Define strict phase-lock rule: no autonomous phase advancement.
- [x] Define required deliverable format per phase.
- [x] Initialize local git repo, create main branch, and connect to GitHub remote.
- [x] Create initial bootstrap commit including AGENTS.md and planning docs.
- [x] Define commit protocol: commit-per-checklist-item traceability.
- [x] Establish canonical in-repo checklist file and update rule.
- [x] Define stop conditions.
- [x] Add proprietary LICENSE with third-party clarification.
- [x] Add THIRD_PARTY_LICENSES.md attribution workflow template.
- [x] Record Phase 0 commit hash(es) and update statuses.
- [x] Review gate G0 approved.

## Phase 0 Execution Log

- 2026-04-27: Added governance and legal artifacts (AGENTS.md, LICENSE, THIRD_PARTY_LICENSES.md, PROJECT_PLAN_CHECKLIST.md).
- 2026-04-27: Initialized git repository on main and created bootstrap commit 0a2793e.
- 2026-04-27: Connected remote origin to https://github.com/imnasnainaec/Rookys.git and pushed main.
- 2026-04-27: User recorded G0 review outcome as Approved.

## Next Action

1. Wait for explicit instruction before starting Phase 2.
2. On approval to proceed, begin Phase 2 core engine state schema work.

## Phase 1 - Project scaffold and quality rails (depends on Phase 0)

Gate G1 status: Approved

- [x] Initialize React + TypeScript (Vite), Redux Toolkit, PeerJS, TensorFlow.js, nanoid, and test stack.
- [x] Establish module boundaries for variant future-proofing (core rules engine, variant config, networking, UI, AI inference/training artifacts).
- [x] Define CI baseline: typecheck, lint, unit tests, build, and Pages artifact generation.
- [x] Configure GitHub Pages deployment path and environment config for public hosting.
- [x] Review gate G1: CI green, app boots in browser, deployment dry-run succeeds.

## Phase 1 Execution Log

- 2026-04-27: Vite React+TS scaffold created and app boots via `npm run dev`.
- 2026-04-27: Added module boundary scaffolding under `src/modules` and Redux store bootstrap.
- 2026-04-27: Added CI and GitHub Pages workflows plus `BASE_PATH` support.
- 2026-04-27: Installed dependencies and validated `typecheck`, `lint`, `test:run`, and `build` successfully.
- 2026-04-27: Added baseline unit test `src/modules/core/index.test.ts` to make test rail executable in CI.
- 2026-04-27: Updated lint ignore rules for generated `coverage` output and kept lint clean without deleting artifacts.
- 2026-04-27: User recorded G1 review outcome as Approved.

## Phase 2 - Core game engine (classic mode) with variant-ready data model (depends on Phase 1)

Gate G2 status: Approved

- [x] Formalize immutable state schema for board, pieces, upgrades, turn metadata, repetition-hash cache, and extensible variant parameters.
- [x] Implement legal move generation and validation for king and rooky rules (no jump, friendly collision restrictions, captures, king safety).
- [x] Implement upgrade action semantics and history reset behavior required by repetition rules.
- [x] Implement terminal detection: check, checkmate, stalemate condition 1, stalemate condition 2.
- [x] Add deterministic state+move hashing strategy and collision-resistant format.
- [x] Write comprehensive engine tests from rules text (positive and negative cases).
- [x] Review gate G2: engine passes all rule tests and independent review confirms rules parity.

## Phase 2 Execution Log

- 2026-04-28: Implemented classic core engine state/action model and rule validations in `src/modules/core/index.ts`.
- 2026-04-28: Added rule-focused engine tests and over-upgrade guard coverage in `src/modules/core/index.test.ts`.
- 2026-04-28: Removed unused starter assets from `src/assets` as repository cleanup.
- 2026-04-28: Expanded `src/modules/core/index.test.ts` with additional positive/negative legality, repetition, terminal-state, hashing, and variant-parameter coverage (15 total tests).
- 2026-04-28: Verified Phase 2 quality rails green via `npm run typecheck`, `npm run lint`, `npm run test:run`, and `npm run build`; pending user gate decision for G2.
- 2026-04-28: Added `src/App.test.tsx`, `src/main.test.tsx`, `src/modules/boundaries.test.ts`, and `src/store/index.test.ts` to reach 100% statement/branch/function/line coverage across all source files (26 tests total).
- 2026-04-28: Applied same-square guard fix to `getDirectionBetween` in `src/modules/core/index.ts` to correctly return `null` for same-square inputs; all quality rails re-verified green.
- 2026-04-28: User recorded G2 review outcome as Approved.

## Phase 3 - Local gameplay UI (depends on Phase 2)

Gate G3 status: Pending

- [ ] Build turn UX flow: select piece -> choose move/upgrade -> select target/direction.
- [ ] Add legal-move highlighting, check/checkmate/stalemate state messaging, undo-disabled constraints matching final rules.
- [ ] Add responsive layout and keyboard-accessible controls for essential actions.
- [ ] Add game log panel for move/upgrade history and rule outcomes.
- [ ] Review gate G3: complete local match can be played end-to-end with no logic/UI desync.

## Phase 4 - P2P multiplayer completion before variants (depends on Phase 3)

Gate G4 status: Pending

- [ ] Implement host/join handshake using share code URL flow.
- [ ] Standardize join URL query flow using `?join=<ID>` for host share links and joiner auto-connect.
- [ ] Synchronize actions (not full state snapshots by default) with deterministic reducer replay.
- [ ] Add resilience paths: reconnect timeout handling, peer disconnect messaging, duplicate/out-of-order action protection.
- [ ] Add host-authoritative fallback for dispute resolution if action streams diverge.
- [ ] Consider idea: use default/free public PeerJS broker configuration in baseline deployment.
- [ ] Create multiplayer test checklist: fresh game sync, capture sync, checkmate sync, upgrade+history-clear sync, repeated-state draw sync.
- [ ] Review gate G4: functioning P2P game accepted as release candidate baseline before any variant implementation starts.

## Phase 5 - Deployment hardening (depends on Phase 4)

Gate G5 status: Pending

- [ ] Publish to GitHub Pages public repo with production build and verified base path.
- [ ] Add release workflow: tagged build, artifact retention, and rollback instructions.
- [ ] Add telemetry-lite diagnostics (non-personal) for connection failures and model load failures.
- [ ] Review gate G5: external users can create/join games successfully from hosted URL.

## Phase 6 - AI architecture and training pipeline with ranking system (depends on Phase 5)

Gate G6 status: Pending

- [ ] Define variant-conditioned observation encoding from day 1 so inference accepts classic and future variant descriptors.
- [ ] Keep first shipped AI scope classic-only play quality, but enforce model API compatibility with variants to avoid refactors.
- [ ] Build training pipeline (Python/Keras) to export tfjs models with semantic versioning and metadata manifest.
- [ ] Consider idea: standardize browser model loading path for tfjs `model.json` from public assets.
- [ ] Consider idea: run browser inference in a Web Worker to avoid UI thread blocking.
- [ ] Implement hybrid difficulty system: fixed checkpoints (easy/normal/hard/expert) + runtime knobs (search depth/noise/time budget).
- [ ] Implement evaluation ladder: round-robin and Elo/Glicko rating updates across checkpoints and heuristic baselines.
- [ ] Add skill calibration targets (expected win-rate bands) for each difficulty label.
- [ ] Persist leaderboard metadata and expose opponent tiers in UI.
- [ ] Review gate G6: ranked AI tiers are reproducible, documented, and selectable in product.

## Phase 7 - Variant implementation (strictly after G4 and ideally after G6) (depends on Phase 6)

Gate G7 status: Pending

- [ ] Implement variant config schema and validation for board size, piece sets, king behavior, wrap-around, shrink modes, reincarnation.
- [ ] Define shrinking-board timing rule: evaluate shrink effects at start of turn.
- [ ] Add variant UI mode toggle to switch variant pane between simple presets and advanced customization.
- [ ] Add explicit variant piece support milestone for Bishy.
- [ ] Add explicit variant piece support milestone for Queeny.
- [ ] Expand engine tests via matrix strategy (core invariants + per-variant rules).
- [ ] Ensure AI inference runs on variants through conditioned inputs, with fallback policy when confidence is low.
- [ ] Add variant compatibility labels per AI tier (native-trained, transfer-capable, fallback-assisted).
- [ ] Review gate G7: each enabled variant passes rules tests, multiplayer sync tests, and AI compatibility checks.

## Phase 8 - Final QA and launch operations (depends on Phase 7)

Gate G8 status: Pending

- [ ] Run full regression suite: local, P2P, AI tiers, and selected variants.
- [ ] Verify legal docs and third-party attribution are current for release.
- [ ] Publish launch checklist and post-launch issue triage workflow.
- [ ] Review gate G8: launch approval with known-issues log.
