# NYX 2D Checkpoint — 0.8.0

Date: 2026-09-02

## Scope

This checkpoint advances NYX from head/body + emissive prototype into the first facial life-motion channel without deforming `face_base`.

Implemented:

- head/body partition remains intact
- head motion cadence tuned to shorter periods and smaller translation
- state-aware head posture bias
- asymmetric torso breathing
- blink cadence and eyelid overlay
- existing emissive pulse
- existing visibility / reduced-motion lifecycle
- existing hidden neck seam reconstruction

## Head motion

Head translation was reduced from the previous large pass while frequency was increased:

- translation remains bounded by the 0.7.2 rig envelope
- X / Y / roll use separate shorter periods
- rotation carries more of the life signal than raw layer translation

State motion now adds restrained posture semantics:

- `processing`: slightly lower / focused
- `warning`: slightly lower and more restrained
- `observing`: small attentive bias
- `success`: one short acknowledgement, then returns to normal life motion
- `idle`: neutral life motion
- `offline`: frozen

## Breathing

Breathing no longer uses a symmetric sine wave.

The canonical master is treated as relaxed exhale. The motion now uses:

- ~38% inhale
- ~62% exhale
- no torso compression below the approved master silhouette

Cadence targets roughly 11–14 breaths/min depending on state.

## Blink

Blink is an opt-in preview:

```bash
VITE_NYX_2D_BLINK=1
```

Properties:

- deterministic irregular cadence
- about 3.7–5.8 seconds between blink windows before state scaling
- ~105ms close
- ~55ms hold
- ~165ms open
- occasional restrained double blink
- disabled for `offline`
- disabled by reduced-motion
- starts fully open

The blink is a separate eyelid overlay attached to the same `headGroup`, so it follows head translation/rotation. The approved face texture itself remains rigid.

The blink plane is `visible=false` when `blinkAmount <= 0.002`, so it adds no draw call for almost the entire idle period.

## Test commands

### Blink only

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_BLINK=1 \
bun run tauri dev
```

### Head + blink

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HEAD_MOTION=1 \
VITE_NYX_2D_BLINK=1 \
bun run tauri dev
```

### Full current life-motion preview

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HEAD_MOTION=1 \
VITE_NYX_2D_BREATH=1 \
VITE_NYX_2D_BLINK=1 \
bun run tauri dev
```

## Visual QA

Check:

- blink lands on both eye apertures
- no eyebrow / hair patch is covered
- eyelid color does not visibly shift the face palette
- blink follows the head during head motion
- no blink overlay remains visible between blinks
- breathing reads as inhale/exhale rather than rubber scaling
- torso never visibly shrinks below the approved neutral silhouette
- head no longer reads as a slow cut-out sliding across the collar

## Next safe step

After blink visual QA:

1. add shared `attentionTarget` contract for Codex / Claude / Cursor
2. connect state + provider attention to head/gaze behavior
3. prototype iris micro-gaze only after a safe eye-base reconstruction exists
4. move to hair follow-through only after a non-ghosting hair partition is available

Do not cut or deform the full face merely to obtain more motion.
