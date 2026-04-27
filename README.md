# Rookys

Phase 1 scaffold for a browser-based Rookys implementation.

## Quick Start

1. Install dependencies:
   - `npm install`
2. Start development server:
   - `npm run dev`
3. Run quality checks:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test:run`
   - `npm run build`

## Architecture Boundaries

- `src/modules/core`: rules engine contracts and core state boundaries.
- `src/modules/variant-config`: variant descriptors and rule toggles.
- `src/modules/networking`: P2P action transport contracts.
- `src/modules/ui`: UI interaction boundary contracts.
- `src/modules/ai`: model metadata and inference boundary contracts.

## GitHub Pages Build Path

Vite reads `BASE_PATH` from environment variables.

- Local default: `/`
- GitHub Pages in this repo: `/Rookys/`

Example production build:

`BASE_PATH=/Rookys/ npm run build`

## CI and Deployment

- `/.github/workflows/ci.yml`: typecheck, lint, tests, build, Pages artifact generation.
- `/.github/workflows/deploy-pages.yml`: build and deploy to GitHub Pages on `main`.
