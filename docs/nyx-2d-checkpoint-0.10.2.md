# NYX 2D Checkpoint 0.10.2

Status: **hair follow-through refinement / opt-in QA**

This checkpoint keeps the approved 0.10.1 anchored head + breathing behavior and refines the first visible hair-motion layer.

## What changed

- Hair no longer has an independent perpetual sine drift.
- Hair follows the approved head posture through a damped spring and is allowed to settle during head holds.
- Head rotation is the primary hair driver; horizontal head translation contributes only a small amount.
- The visible overlay mask now uses spatial weighting:
  - left outer silhouette: strongest near the outside edge, fades toward the protected face
  - right outer silhouette: strongest near the outside edge, fades toward the protected face
  - crown: strongest toward the top silhouette, fades toward the forehead boundary
- Purple-hair confidence is still required in addition to the spatial safe-zone mask.
- Overlay opacity is reduced to limit duplicate/ghost hair while this remains a non-destructive preview.
- The approved master image is not cut or destructively modified.
- Blink remains quarantined.

## Safety contract

The moving hair candidate must not enter `protectedFace`.

This stage intentionally does **not** implement:

- moving bangs/fringe over the face
- destructive removal of original hair pixels from the base layer
- full Live2D-style hair strand segmentation
- independent wind motion

If the preview looks wrong, disabling the feature returns exactly to the approved master composition.

## Test commands

Baseline head + breathing:

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HEAD_MOTION=1 \
VITE_NYX_2D_BREATH=1 \
bun run tauri dev
```

Hair follow-through preview:

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HEAD_MOTION=1 \
VITE_NYX_2D_BREATH=1 \
VITE_NYX_2D_HAIR_MOTION=1 \
bun run tauri dev
```

Hair mask debug only:

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HAIR_MASK_DEBUG=1 \
bun run tauri dev
```

## Visual QA

PASS when:

- outer purple hair has a slight delayed follow-through after head adjustments
- hair settles during head posture holds
- there is no obvious duplicate full hairstyle
- no moving pixels cross the eyes, nose, mouth, or protected face
- no cyan/magenta suit neon is mistaken for hair

FAIL when:

- hair looks like a second transparent wig
- hair keeps drifting while the head is holding still
- the face edge ghosts or smears
- collar/suit pixels move with the hair

## Next

After this hair preview is visually accepted:

1. state-transition continuity (no neutral reset on runtime state changes)
2. optional destructive hair partition only if the non-destructive preview proves useful
3. re-evaluate gaze and eyelid requirements
