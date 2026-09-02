# NYX 2D Checkpoint — 0.16.0 State-specific Gestures

## Goal

Add restrained semantic reactions to NYX runtime states without touching facial assets or destabilizing the approved head/neck partition.

## Stable runtime

- canonical NYX 2D renderer
- anchored head posture
- torso breathing
- hair follow-through
- provider-directed gaze
- emissive/core state response
- live-state continuity
- one-shot state-entry gestures
- performance telemetry

Blink remains blocked behind the 0.15.0 facial overlay asset gate.

## Gesture contract

State-entry gestures are one-shot whole-operator transforms. They do not modify the internal head/body geometry and therefore cannot create a new neck seam.

- `idle`: none
- `offline`: none
- `observing`: `attention-settle`, 900 ms
- `processing`: `focus-settle`, 1050 ms
- `warning`: `alert-brace`, 820 ms
- `success`: `success-ack`, 980 ms

The gestures must return to the exact neutral transform after completion. No gesture loops.

## Motion ownership

Continuous head posture no longer contains state-entry acknowledgements. In particular, the old success acknowledgement that depended on the renderer's global elapsed clock was removed. This prevents late state transitions from missing their reaction and keeps state-entry semantics separate from idle posture.

## Reduced motion

All state-entry gestures are disabled by `prefers-reduced-motion: reduce`.

## Rollback

Normal stable runtime:

```bash
bun run tauri dev
```

Disable only state-entry gestures while retaining head, breath, hair, gaze and emissive:

```bash
bun run operator:preview:gestures-off
```

Equivalent environment override:

```bash
VITE_NYX_2D_GESTURES=0 bun run tauri dev
```

## Visual QA

Pass criteria:

1. Observing reads as a tiny attention adjustment, not a lean or sway.
2. Processing reads as a subtle focus/settle, not a repeated nod.
3. Warning reads as a brief brace, never a shake or vibration.
4. Success reads as one restrained acknowledgement, never a bounce.
5. Feet/body framing should not visibly jump at gesture start/end.
6. Head/neck seam must look identical before, during and after a gesture.
7. Existing head/breath/hair/gaze motion remains continuous underneath the entry gesture.
8. Reduced-motion mode produces no entry transform.

If any gesture is visually distracting, use the gesture-only rollback rather than disabling the 2D renderer.
