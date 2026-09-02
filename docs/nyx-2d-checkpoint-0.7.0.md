# NYX 2.5D Checkpoint — 0.7.0

Date: 2026-09-02

This checkpoint follows the approved 941×1672 transparent NYX master and the static fidelity PASS.

## What changed

- head motion amplitude was increased from a sub-pixel result to a perceptible Dashboard-scale range
- processing / idle head motion now targets roughly 1–3 CSS pixels at ordinary main-window sizes
- maximum head rotation envelope increased to 1.4°, with state attenuation keeping actual motion below that cap
- warning remains more restrained than observing / success
- torso breathing preview added behind a separate feature flag
- torso deformation uses a persistent 8×16 segmented plane (153 vertices)
- only the feathered torso zone receives deformation weight
- hips / legs remain effectively anchored
- emissive overlay shares the torso-deformed geometry so suit glow stays aligned during breathing
- head and body motion both start from exact neutral pose at t=0
- hidden / offscreen / reduced-motion lifecycle continues to stop motion

## Flags

### 2D static / emissive baseline

```bash
VITE_NYX_RENDERER=2d bun run tauri dev
```

### Head motion only

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HEAD_MOTION=1 \
bun run tauri dev
```

### Torso breathing only

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_BREATH=1 \
bun run tauri dev
```

### Head + breathing

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HEAD_MOTION=1 \
VITE_NYX_2D_BREATH=1 \
bun run tauri dev
```

### Rig debug + all current motion

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_RIG_DEBUG=1 \
VITE_NYX_2D_HEAD_MOTION=1 \
VITE_NYX_2D_BREATH=1 \
bun run tauri dev
```

## Review criteria

Head motion:

- clearly perceptible without staring for several seconds
- no bobble-head feel
- neck/collar seam remains hidden
- face remains rigid and undistorted

Torso breathing:

- reads as breathing rather than whole-body scaling
- bust / upper torso may move subtly
- waist should not visibly pump
- hips and feet must remain stable
- emissive seams should remain attached to the suit

Combined motion:

- head and torso must not look mechanically synchronized
- total movement should make NYX feel alive while retaining the hero-pose identity
- processing should remain calmer than observing/success
- warning should become focused, not agitated

## Current non-goals

Still not implemented at this checkpoint:

- eye gaze
- blink
- eyebrow overlays
- hair spring / mesh deformation
- provider-directed attention
- production atlas batching

Do not enable the preview flags by default until visual review passes.
