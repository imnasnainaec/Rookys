# Rookys

The game is live at https://imnasnainaec.github.io/Rookys/
But it is very buggy, still in early development.

## Development

### Quick Start

1. Install dependencies:
   - `npm install`
2. Start development server:
   - `npm run dev`
3. Run quality checks:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test:coverage`
   - `npm run build`

### Architecture Boundaries

- `src/modules/core`: rules engine contracts and core state boundaries.
- `src/modules/variant-config`: variant descriptors and rule toggles.
- `src/modules/networking`: P2P action transport contracts.
- `src/modules/ui`: UI interaction boundary contracts.
- `src/modules/ai`: model metadata and inference boundary contracts.

### GitHub Pages Build Path

Vite reads `BASE_PATH` from environment variables.

- Local default: `/`
- GitHub Pages in this repo: `/Rookys/`

Example production build:

`BASE_PATH=/Rookys/ npm run build`

### CI and Deployment

- `/.github/workflows/ci.yml`: typecheck, lint, tests, build, Pages artifact generation.
- `/.github/workflows/deploy-pages.yml`: build and deploy to GitHub Pages on `main`.
- `/.github/workflows/release.yml`: triggered on `v*.*.*` tags; runs full quality gates, builds the production artifact, attaches the dist zip to a GitHub Release, and uploads it as a workflow artifact (90-day retention).

### Deployment & Rollback

**Release a new version**

```bash
git tag v1.0.0
git push origin v1.0.0
```

The `release.yml` workflow runs quality gates, builds, and creates a GitHub Release with the dist zip attached.

**Roll back to a previous version**

1. Find the desired release on the [GitHub Releases page](../../releases).
2. Download the attached `rookys-vX.Y.Z.zip` artifact.
3. Extract and re-upload the dist folder to GitHub Pages manually, or re-tag the target commit and push:

```bash
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0
git tag v1.0.0 <previous-commit-sha>
git push origin v1.0.0
```

The Pages deploy workflow will automatically redeploy from the `main` branch. To force a Pages redeploy from a previous commit, reset `main` to that commit and push.
