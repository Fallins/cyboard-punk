# NYX 2D Checkpoint — 0.10.0

Date: 2026-09-02

## Added since 0.9.1

- first visible hair follow-through preview
- high-confidence purple-hair runtime mask
- face-safe spatial restriction
- damped spring driver wired to head motion
- tiny independent ambient hair drift
- hidden / reduced-motion / offline lifecycle gating
- runtime metrics for hair readiness, mask size and spring angle

## Important safety model

This is **not** the final complete hair partition.

The v0.10 preview deliberately does not remove or deform the approved base hair.
Instead it extracts only high-confidence purple hair pixels inside these face-safe areas:

```text
hairOuterLeft
hairCrown
hairOuterRight
```

The extracted accent layer is rendered above the approved head and receives a small damped follow-through rotation.

This means:

- face pixels are never removed
- bangs/fringe over the face are not moved
- no hidden cheek/forehead reconstruction is required yet
- disabling the feature returns exactly to the approved base composition
- a bad mask cannot punch transparent holes into the face

The tradeoff is that excessive motion can read as a duplicate/ghost strand. Therefore the preview must remain small and must pass visual QA before a true hair partition is attempted.

## Enable hair follow-through

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HEAD_MOTION=1 \
VITE_NYX_2D_BREATH=1 \
VITE_NYX_2D_GAZE=1 \
VITE_NYX_2D_HAIR_MOTION=1 \
bun run tauri dev
```

Blink does not need to be enabled. The synthetic blink renderer remains quarantined after the 0.9.1 visual failure.

## Hair mask inspection

To inspect the larger candidate zones separately:

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HAIR_MASK_DEBUG=1 \
bun run tauri dev
```

The runtime hair-motion mask is stricter than the rectangular debug zones: it also requires purple-hair color confidence and rejects most bright neon pixels.

## Expected behavior

- follow-through should lag slightly behind head roll
- movement should be concentrated on outer purple hair accents
- crown/root should appear anchored
- no eyebrow, eye, cheek, nose or mouth pixel should move
- no cyan/magenta suit seam should appear attached to the hair layer
- neutral pose should look effectively identical to the approved master

## Performance

When hair motion is enabled:

- one additional alpha-map texture is created from `NYX_MASTER` at runtime
- one additional hair overlay draw call is used
- the alpha map is generated once after the master image decodes
- no per-frame texture or geometry allocation occurs
- hair spring state is persistent
- spring `dt` is clamped to prevent resume explosions
- motion loop runs at up to 30 FPS when gaze or hair preview is enabled

Runtime debug metadata includes:

```text
data-hair-motion-requested
data-hair-motion-ready
data-hair-motion-animated
data-hair-angle-deg
data-hair-masked-pixels
```

## Blocking failures

Disable / revise hair motion if any of these appear:

1. obvious duplicate-hair ghosting
2. moving pixels on the face
3. moving collar / suit neon
4. hair appears detached from the scalp
5. outer silhouette flickers
6. spring overshoots after window resume

## Next step

After this preview passes, replace the accent overlay with a true source hair partition and explicit hidden-area reconstruction, then split outer-left / crown / outer-right into separately weighted follow-through groups.

Separately, runtime state changes still need transition smoothing so state updates do not reset the entire motion loop to neutral.
