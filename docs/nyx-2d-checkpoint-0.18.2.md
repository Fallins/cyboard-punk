# NYX 2D checkpoint 0.18.2 — live motion tuning calibration

## Why this checkpoint exists

Real screen-recording review showed that state overrides were working, but the semantic motion differences were too small to read at Dashboard scale. Breathing was the only channel that remained obvious without close inspection.

This checkpoint separates **production motion defaults** from an intentionally exaggerated **test calibration profile** so values can be judged visually before being promoted.

## Production defaults

When `NYX test controls` are disabled:

- breath: `1.25x`
- entry gesture: `1.00x`
- sustained stance: `1.00x`
- continuous head activity: `1.00x`

The breath lift is intentional and approved for this calibration pass. Other semantic channels remain at their existing production magnitude until a visually preferred value is chosen.

## Test calibration defaults

When `NYX test controls` are enabled, the local in-memory tuning panel starts at:

- breath: `1.35x`
- entry gesture: `3.00x`
- sustained stance: `3.00x`
- continuous head activity: `2.00x`

These values are deliberately exaggerated. They are **not production defaults**.

## Live controls

The state simulator now exposes four range controls:

- `BREATH` — `0..2x`
- `GESTURE` — `0..5x`
- `STANCE` — `0..5x`
- `HEAD` — `0..3x`

Each channel can be set to `0x` for direct A/B isolation. Current values are displayed next to each slider. `RESET TUNING` restores the exaggerated test calibration defaults.

Tuning values are in-memory only. Hiding test controls returns NYX to production defaults and prevents experimental calibration values from becoming persisted application settings.

## Replay behavior

Clicking the currently selected simulated state again briefly re-enters the state so its one-shot entry gesture replays. This makes it possible to adjust `GESTURE` and immediately compare the same state without selecting a different state first.

## Runtime implementation

- `src/ui/nyx2dTuning.ts` owns production/test defaults, clamp ranges, runtime tuning and gesture CSS variables.
- torso breath and head motion read the current runtime tuning each frame.
- sustained state stance uses the current `STANCE` multiplier reactively.
- entry gestures use concrete CSS custom-property values generated from the `GESTURE` multiplier.
- blink remains blocked/quarantined and is unaffected by this tuning panel.

## Visual calibration goal

Use the controls to find the smallest values where `OBSERVE`, `PROCESS`, `WARNING`, and `SUCCESS` are immediately distinguishable without staring at the character. Once the preferred values are chosen, promote only those values into the production tuning profile.
