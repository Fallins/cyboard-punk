# 04 — Work State

Last updated: **2026-09-12**

This file is the resumable state pointer. Keep it concise and current. Historical detail belongs in `05_VISUAL_REVIEW.md` and git history.

## Repository state

```text
repo: Fallins/cyboard-punk
workflow branch: feature/visual-agent-workflow
base: main @ 35b2face87df9b98f052f19a7b1baf073285eac7
```

## Current stage

```text
stage: STAGE 6 — ANIMATION & SECONDARY MOTION
status: PASS
next stage: STAGE 7 — RUNTIME INTEGRATION & PERFORMANCE
```

## Current goal

Stage 6 is complete. NYX now has a reviewed front-facing motion set built strictly on the frozen Stage 5 2D/2.5D rig: idle/breathing, attention/head/gaze, source-derived blink, and acknowledgement gesture. Stage 7 may integrate this exact motion set only behind a reversible experimental runtime path and must not change motion envelopes, rig topology, neutral identity, or the production default path without reopening the affected earlier gate.

## Selected direction / medium

```text
character: NYX
role: CYBOARD primary Operator / AI Signal Intelligence Operator
preferred production direction: 2D / 2.5D
Stage 2 base: 2D / 2.5D vector silhouette proxy
Stage 3 identity: locked-reference-pixel overlay
Stage 4 appearance: locked-reference-pixel appearance proxy
Stage 5 rig: hybrid articulated source-pixel layers + piecewise-affine mesh cages
Stage 6 animation: timing/keyframes on the frozen Stage 5 front-facing rig
production 3D runtime: NOT restored / NOT authorized
```

## Protected production baseline

Do not modify during Stages 0–7:

```text
assets/operator/nyx/source-lock.json
assets/operator/nyx/source/master.webp
assets/operator/nyx/rig.json
docs/nyx-2.5d-asset-spec.md
current production 2D renderer/default path
```

## Current artifacts

```text
reference set: nyx-stage1-master-reference-v1
reference lock: assets/operator/nyx-redesign/references/stage-01/reference-lock.json

revalidated Stage 2 base: nyx-stage2-base-v03
Stage 2 path: assets/operator/nyx-redesign/experimental/stage-02/base-v03

frozen Stage 3 identity: nyx-stage3-face-hair-v02
Stage 3 path: assets/operator/nyx-redesign/experimental/stage-03/face-hair-v02

revalidated Stage 4 appearance: nyx-stage4-material-v02
Stage 4 path: assets/operator/nyx-redesign/experimental/stage-04/material-v02

frozen Stage 5 rig: nyx-stage5-rig-v01
Stage 5 path: assets/operator/nyx-redesign/experimental/stage-05/rig-v01
rig contract: assets/operator/nyx-redesign/experimental/stage-05/rig-v01/rig.json

active Stage 6 animation: nyx-stage6-anim-v01
Stage 6 path: assets/operator/nyx-redesign/experimental/stage-06/anim-v01
animation contract: assets/operator/nyx-redesign/experimental/stage-06/anim-v01/animation.json
animation freeze: assets/operator/nyx-redesign/experimental/stage-06/anim-v01/freeze.json
review metadata: assets/operator/nyx-redesign/experimental/stage-06/anim-v01/review/capture-manifest.json
review capture: assets/operator/nyx-redesign/experimental/stage-06/anim-v01/review/motion-captures.svg
stage manifest: assets/operator/nyx-redesign/experimental/stage-06/stage-06-manifest.json
```

## Earlier revalidation retained

Stage 5 exposed and locally fixed the inherited Front forearm/hand clipping in Stage 2/4. The corrected `nyx-stage2-base-v03` and `nyx-stage4-material-v02` remain the active frozen authorities. Recorded Stage 2 proportion anchors are unchanged, neutral visible RGB difference against locked `REF-FRONT` remains `0`, and Stage 3 face/hair identity was never edited.

## Stage 5 safe deformation envelope — still frozen

```text
front-facing proof only
neck: within tested 6° envelope
shoulder/arm: -30° .. 0°
elbow/forearm: -22° .. 0°
wrist additional: -6° .. 0°
torso: within tested 4° envelope
hip/knee: subtle tested weight-shift only
new orientation / larger range / new topology: NOT AUTHORIZED
```

Stage 5 checker capture remains authoritative for deformation integrity: no unresolved black seam, interpenetration, source-fragment ghost, volume collapse, accidental face deformation, or costume/body separation exists in the tested safe range.

## Stage 6 motion proof

### Idle / breathing

```text
duration: 5000 ms loop (~0.20 Hz)
neck peak: +0.55°
torso peak: -0.55°
hips/legs: neutral
secondary spring: none
```

The cadence is calm and returns exactly to neutral each cycle. The amplitude is far inside the Stage 5 neck/torso deformation proof.

### Attention / gaze / head

```text
head response: ~280 ms
body response: ~720 ms
neck settle: +2.2° max
torso settle: -0.55° max
gaze: <= 1 source px in the reviewed proof
interpolation: damped / no overshoot
```

Provider-side direction may mirror the sign later in Stage 7, but may not increase the recorded magnitude.

### Blink / expression

```text
duration: 310 ms
close: 0 -> 95 ms
hold: 95 -> 150 ms
re-open complete: 310 ms
construction: local source-derived upper-lid/skin resampling inside conservative eye windows
face-base / mouth / jaw / cheek deformation: none
```

Stage 6 v01 intentionally limits expression vocabulary to gaze softening + blink. A future smile/mouth expression would require an approved face-safe asset/deformation proof rather than silently modifying frozen identity.

### Acknowledgement gesture

```text
duration: 1400 ms
peak: 560 ms
neck peak: +1.6°
torso peak: -0.9°
shoulder peak: -14°
elbow peak: -10°
wrist additional peak: -3°
settle: all channels return to neutral by 1400 ms
overshoot: none
perpetual oscillation: none
```

Shoulder leads; elbow/wrist trail. Every secondary channel decays monotonically after the peak, so the gesture has follow-through without springy or perpetual motion.

## Lifecycle policy frozen by Stage 6

```text
reduced motion: static neutral composition; no continuous/automatic character motion
hidden window/document: zero intentional animation frames; pause all motion/procedural clocks
resume: discard hidden elapsed time; no catch-up jump
semantic/provider retarget: preserve filtered motion state; do not restart breathing clock
```

## Frozen after Stage 6 PASS

```text
production NYX assets/runtime: FROZEN BASELINE
Stage 0 direction: FROZEN
Stage 1 references: FROZEN MASTER
Stage 2 base-v03 proportions + revalidated outer silhouettes: FROZEN
Stage 3 face/hair identity: FROZEN
Stage 4 material-v02 static appearance: FROZEN
Stage 5 rig topology / pivots / tested deformation ranges / correctives: FROZEN
Stage 6 idle/breathing cadence + amplitudes: FROZEN
Stage 6 attention head/body timing + gaze envelope: FROZEN
Stage 6 blink construction + timing: FROZEN
Stage 6 acknowledgement timing + amplitudes + monotonic settle: FROZEN
Stage 6 reduced-motion / hidden-window behavior: FROZEN
```

## Allowed changes for Stage 7

- integrate `nyx-stage6-anim-v01` behind a reversible, explicitly experimental runtime path;
- keep the current production NYX fallback/default fully functional and untouched;
- map semantic state/provider attention to the frozen Stage 6 channels without changing their maxima/timing contract;
- validate persistent mounting, lifecycle, fallback, hidden/reduced-motion behavior and runtime errors;
- take actual runtime captures and compare them to the locked references and Stage 6 review artifact;
- measure against the current budgets in `docs/performance.md` and run the relevant project validation checks;
- make local integration/performance fixes that do not reduce visual fidelity or alter frozen motion/identity contracts.

## Forbidden changes for Stage 7

- switching the production default renderer or overwriting protected production NYX assets;
- changing Stage 6 motion amplitudes, timings, blink construction, settle behavior or lifecycle policy without reopening Stage 6;
- extending the Stage 5 rig ranges, adding non-Front orientation, locomotion, jump, or new deformation topology without reopening Stage 5;
- changing Stage 2 proportions, Stage 3 identity, Stage 4 static appearance, or locked reference pixels;
- treating successful experimental integration as Stage 8 promotion.

## Remaining / deferred

- runtime integration, lifecycle implementation and performance measurement belong to Stage 7;
- final reference/runtime regression audit and promotion decision belong to Stage 8;
- non-Front motion, locomotion/jump and expanded mouth/expression animation are intentionally absent from the current product proof;
- no experimental asset has been promoted to production.

## Next action

Open a **new chat** for Stage 7 using the `STAGE 6 -> STAGE 7` prompt in `06_STAGE_HANDOFFS.md`.

Do not begin Stage 7 in this Stage 6 chat.
