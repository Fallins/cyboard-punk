# NYX 2D checkpoint 0.17.0

## Scope

0.17.0 finalizes the runtime lifecycle around the graduated NYX 2D motion stack. It does not add a new visual channel.

Stable channels remain:

- anchored head posture
- torso breathing
- hair follow-through
- provider-directed gaze
- state entry gestures
- emissive/core response
- live-state continuity

Blink remains blocked by the facial overlay asset gate.

## Final lifecycle contract

`src/ui/nyx2dLifecycle.ts` defines four runtime modes:

- `loading`: assets/runtime are not ready; do not render or run RAF.
- `suspended`: inactive, offscreen, or document hidden; do not render or run RAF.
- `static`: reduced motion, offline, or no animated channels; render a neutral/static frame and keep RAF stopped.
- `animated`: visible live runtime with animated channels; RAF may run.

Resume policy is **restart-on-resume**. Background time is never accumulated into hair/gaze integration. This avoids large delta-time jumps after the app/window becomes visible again.

## Managed boundary

`Nyx2DManagedRuntime.tsx` wraps the approved WebGL renderer and owns outer visibility/offscreen policy. The WebGL core remains unchanged so the validated head/neck/body partition is not reopened during lifecycle hardening.

The operator stage exposes diagnostics:

- `data-nyx2d-lifecycle`
- `data-nyx2d-lifecycle-reason`
- `data-nyx2d-clock-policy="restart-on-resume"`

## Performance telemetry

Performance streaks are meaningful only while lifecycle mode is `animated`.

When the runtime enters `suspended` or `static`:

- warning history is cleared
- violation streak resets to zero
- `data-nyx2d-performance="paused"`

A prior slow frame must never survive a background/offline/reduced-motion boundary and appear as a current warning after resume.

## QA

Run:

```bash
bun run tauri dev
```

Validate:

1. switch CYBOARD to background and return; NYX resumes without a hair/gaze jump.
2. move the operator stage offscreen/onscreen where possible; animation should suspend and restart cleanly.
3. enable macOS Reduce Motion; NYX should become static without breaking monitoring or UI state.
4. transition live -> offline -> live; offline stays static and live resumes from a clean local motion clock.
5. state transitions inside the live band must not restart the renderer.
6. performance warning streaks must reset across suspended/static boundaries.

## Rollback paths

Individual visual channels still retain their QA opt-outs. The legacy 3D renderer remains available through:

```bash
bun run operator:preview:3d
```

Do not remove the 3D rollback path until 0.17.x lifecycle QA passes on the target macOS hardware.
