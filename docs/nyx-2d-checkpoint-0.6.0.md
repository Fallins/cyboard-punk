# NYX 2D — 0.6.0 Calibration Checkpoint

Date: 2026-09-02  
Status: **STATIC FIDELITY PASSED / FIRST ANATOMY PARTITION ACTIVE / HEAD MOTION PREVIEW OPT-IN**

## Locked source

Canonical source:

```text
assets/operator/nyx/source/master.webp
941 × 1672
588,284 bytes
SHA-256 6ef57008ba843a57b614d148f4055c9fdf9235f303117098ac3e13387041f263
```

The approved six-image NYX series remains `series-locked-no-redesign`.

## Runtime stage

Default 2D runtime now renders:

```text
body base layer
+
head layer
+
state-driven emissive layer
```

The body/head split is binary and uses complementary alpha maps over the same canonical master texture. No anatomical transform is enabled by default.

First partition:

```text
source y = 300 px
```

This is near the neck/collar/shoulder transition and is explicitly treated as a calibration cut, not the final authored layer boundary.

## Protected face

`protectedFace` remains a rigid calibration zone. No face mesh deformation exists in 0.6.0.

## Effect motion

The emissive/core layer has a restrained 24 FPS maximum pulse when visible and motion is allowed. It stops when:

- `document.hidden`
- operator host leaves the viewport
- parent runtime marks the operator inactive
- reduced motion is requested

Resume starts a fresh animation epoch; hidden elapsed time is never replayed.

## Optional calibration modes

### Normal 2D checkpoint

```bash
VITE_NYX_RENDERER=2d bun run tauri dev
```

Expected:

- visually same NYX identity / silhouette as approved master
- head/body are separate render layers but remain perfectly aligned
- emissive/core pulse is subtle
- no anatomy motion

### Rig-zone debug

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_RIG_DEBUG=1 \
bun run tauri dev
```

Shows calibration bounds for:

- head
- protected face
- torso
- hips
- legs
- core

This mode is only for verifying where future layer/motion ownership will live.

### Head micro-motion preview

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HEAD_MOTION=1 \
bun run tauri dev
```

This enables an intentionally tiny transform-only head preview around the neck pivot.

Safety properties:

- feature is off by default
- offline = frozen
- reduced motion = frozen
- hidden/offscreen = RAF stopped
- all channels start from exact neutral pose
- motion stays within the v1 head envelope
- a procedural 18px hidden seam patch is generated behind the head from neighboring approved neck/collar pixels
- no generative reconstruction

The preview is a seam/motion feasibility test. It is **not** approval to expand head motion or begin face deformation.

### Combined calibration

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_RIG_DEBUG=1 \
VITE_NYX_2D_HEAD_MOTION=1 \
bun run tauri dev
```

Use this only to inspect motion relative to rig zones.

## Runtime targets at this checkpoint

Normal mode should remain well below the project budget:

- body + head + emissive: ~3 draw calls
- optional hidden seam during head-motion preview: +1 draw call
- optional rig debug: +1 draw call
- one canonical source texture plus two tiny 1×1672 partition alpha maps
- no per-frame geometry allocation
- no physics solver
- maximum effect/motion loop: 24 FPS

## Blocking visual checks before making head motion default

Head motion preview must be rejected if any of these are visible:

- neck/collar hole
- doubled collar or shoulder
- face identity shift
- face blur caused by transform/filtering
- obvious horizontal cut at y=300
- static emissive ghost remaining behind moving head
- head motion reading as bobble-head / VTuber motion

If rejected, keep head motion disabled and refine the partition/hidden reconstruction first.

## Next after checkpoint approval

1. calibrate head/body seam from real runtime screenshot
2. replace temporary horizontal partition with authored semantic head/hair/neck ownership
3. create torso-only partition and static reconstruction
4. add subtle breathing only after torso static fidelity passes
5. split eyes/blink only after face-protected source extraction is proven lossless
6. hair spring comes after head + torso ownership is stable

Do not begin full facial deformation or large-angle fake 3D turns.
