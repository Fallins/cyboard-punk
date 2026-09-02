# NYX 2D Checkpoint 0.7.1

Date: 2026-09-02

This patch deliberately increases NYX life-motion amplitude after real Dashboard review showed the 0.7.0 motion was technically present but visually negligible.

## Readability target

The operator should look alive without requiring the viewer to stare at a single landmark.

The goal is not maximal motion. The goal is motion that survives the actual CYBOARD Dashboard scale.

## Head motion

For `processing` / `idle` at the current hero size, target visible output is approximately:

- horizontal travel: 4–8 CSS px
- vertical travel: 2–5 CSS px
- roll: roughly 1.5–2.2 degrees

`warning` remains more restrained than other active states so the operator does not read as a bobble-head during alerts.

The face remains rigid. No facial mesh deformation was introduced.

## Breathing

Torso breathing was raised into a visibly readable range:

- torso vertical motion is stronger
- upper torso vertical expansion target is around 1–2%
- horizontal expansion remains smaller than vertical expansion
- hip and leg weights remain stable

This should read as chest / shoulder breathing rather than whole-character rubber scaling.

## Hidden seam support

The neck/collar hidden reconstruction band increased from 18 px to 24 px and its horizontal support range widened slightly to accommodate the stronger head preview.

The reconstruction remains deterministic and source-derived; no generative redraw is used.

## Regression guards

Tests now include minimum-motion floors as well as maximum bounds.

A future tuning pass must not silently reduce `processing` head motion or torso breathing back into the previous sub-pixel / visually negligible regime.

## Review command

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HEAD_MOTION=1 \
VITE_NYX_2D_BREATH=1 \
bun run tauri dev
```

Review the combined result first. The expected reaction is that NYX clearly reads as alive during normal viewing, without obvious puppet-like or rubber-body artifacts.
