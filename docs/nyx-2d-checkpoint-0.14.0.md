# NYX 2D checkpoint — 0.14.0

## Status

Gaze has graduated into the stable NYX 2D runtime.

Stable now contains:

- approved 2D NYX master
- anchored head posture
- asymmetric torso breathing
- outer-hair follow-through
- state-driven emissive/core response
- provider-directed safe gaze
- live-state continuity
- sustained performance telemetry

Synthetic blink remains quarantined.

## Gaze graduation rules

The 0.14.0 gaze implementation is deliberately non-destructive:

- `center` attention is exact neutral; there is no perpetual eye-scanning oscillator.
- provider-directed eye travel uses reduced UV bounds (`u <= 0.0036`, `v <= 0.0016`).
- the approved base face/eye pixels are never erased.
- the gaze layer only reuses approved iris/pupil pixels as a low-opacity moved accent.
- the overlay is fully discarded at exact center.
- the iris accent opacity is capped in the shader at 0.34.
- **Do not restore sclera reconstruction / sampled eye-hole filling.** Sampling adjacent eyelid, liner or shadow pixels can produce dark/black eye artifacts and is not an accepted production technique.

## Lifecycle

Gaze stops when:

- the operator is offline
- the stage is hidden/inactive
- reduced motion is requested

Provider target changes continue to use renderer damping rather than instant jumps.

## Rollback / A-B

Normal stable runtime:

```bash
bun run tauri dev
```

Disable gaze only while keeping the rest of stable 2D motion:

```bash
bun run operator:preview:gaze-off
```

Equivalent manual form:

```bash
VITE_NYX_2D_GAZE=0 bun run tauri dev
```

Old 3D rollback remains:

```bash
bun run operator:preview:3d
```

## Runtime profiles

`stable` and `enhanced` currently expose the same graduated visual channels. `enhanced` remains reserved as the telemetry/performance slot for the next experimental motion channel; it must not silently enable synthetic blink.

## Visual QA focus

When validating gaze, check:

1. eyes remain identical to the approved master while attention is centered;
2. no black rectangle, black iris patch, or sudden dark eye flash appears;
3. provider-directed gaze reads as subtle attention rather than independent floating eyes;
4. target changes damp smoothly;
5. head/hair/breath remain visually dominant over eye motion;
6. stable performance telemetry remains within budget.
