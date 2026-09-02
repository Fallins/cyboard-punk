# NYX 2D Checkpoint 0.11.0

Status: **2D PRODUCTION DEFAULT**

## Stable runtime

NYX 2D is now the default female operator renderer.

Normal development launch:

```bash
bun run tauri dev
```

No NYX renderer environment variable is required.

Stable motion enabled by default:

- head anchored posture
- torso breathing
- state-driven emissive/core response
- live-state transition continuity

Stable motion can still be explicitly disabled for QA:

```bash
VITE_NYX_2D_HEAD_MOTION=0 \
VITE_NYX_2D_BREATH=0 \
bun run tauri dev
```

## Experimental channels

The following remain opt-in and are not production defaults yet:

- gaze
- hair follow-through
- blink

Blink remains quarantined and must not be promoted without a real eyelid/closed-eye source.

Enhanced preview:

```bash
bun run operator:preview:2d
```

This adds gaze and hair motion to the stable 2D runtime while keeping blink disabled.

## 3D rollback / A-B

The legacy 3D NYX renderer remains available as an explicit rollback path:

```bash
bun run operator:preview:3d
```

Equivalent environment override:

```bash
VITE_NYX_RENDERER=3d bun run tauri dev
```

3D is no longer the default.

## Renderer resolution contract

```text
VITE_NYX_RENDERER=3d -> legacy 3D
VITE_NYX_RENDERER=2d -> 2D
unset / empty / unknown -> 2D
```

This intentionally fails toward the approved 2D runtime instead of silently reverting to the old 3D asset.

## Lifecycle

The stable motion channels still obey:

- hidden / inactive => stop animation
- reduced motion => static / minimal effects
- offline => lifecycle stop/reset
- idle / observing / processing / warning / success => same live animation lifecycle

## Acceptance criteria

Before retiring the legacy 3D path:

- stable 2D must remain visually clean in ordinary dashboard use
- no head/collar sliding regression
- no lifecycle snap across live states
- normal app startup must not require asset-generation tooling
- fallback must remain independent of WebGL success
- enhanced gaze/hair channels need separate visual approval before promotion
