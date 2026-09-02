# NYX 2D checkpoint — 0.18.0

## Release decision

NYX is now a **2D-only production operator**.

The retired 3D NYX implementation is intentionally deleted rather than retained as a rollback path.

## Removed

- `src/ui/NyxProductionWebGL.tsx`
- `scripts/dev-nyx3d-rollback.mjs`
- `scripts/build-nyx-production.mjs`
- `public/operator/nyx/nyx.glb`
- `public/operator/nyx/poster.webp`
- `operator:preview:3d`
- `operator:build:nyx`
- `VITE_NYX_RENDERER`
- NYX GLB entry in `src/ui/operator-manifest.json`

## Production contract

NYX production path is always:

`OperatorStage -> Nyx2DManagedRuntime -> Nyx2DWebGL`

If NYX 2D WebGL becomes unavailable, fallback stays inside the approved 2D/static source path. It must never switch to a 3D NYX implementation.

Stable graduated channels remain:

- anchored head posture
- breathing
- hair follow-through
- provider-directed gaze
- emissive/core response
- state transition continuity
- state entry gestures
- managed lifecycle pause/resume
- performance telemetry

Blink remains gated and blocked until an approved source-overlay asset exists.

## Release guard

`bun run operator:validate:release` now fails if any retired NYX 3D runtime, asset, build command, rollback launcher, manifest entry, or renderer-selection switch is reintroduced.

`bun run check` includes the release guard and NYX 2D validation.

## AXON

AXON is a separate operator preview path and is not changed by this NYX retirement checkpoint.
