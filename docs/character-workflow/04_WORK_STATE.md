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
stage: STAGE 5 — RIG & DEFORMATION
status: PASS
next stage: STAGE 6 — ANIMATION & SECONDARY MOTION
```

## Current goal

Stage 5 is complete. NYX now has a front-facing 2D/2.5D hybrid deformation structure: mesh cages for neck/torso/hip-knee and articulated locked-source-pixel layers for shoulder/arm/elbow/wrist. Stage 6 may animate only inside the tested safe ranges recorded by `rig-v01/rig.json`; it may not broaden rig topology or pose ranges without reopening Stage 5.

## Selected direction / medium

```text
character: NYX
role: CYBOARD primary Operator / AI Signal Intelligence Operator
preferred production direction: 2D / 2.5D
Stage 2 base: 2D / 2.5D vector silhouette proxy
Stage 3 identity: locked-reference-pixel overlay
Stage 4 appearance: locked-reference-pixel appearance proxy
Stage 5 rig: hybrid articulated source-pixel layers + piecewise-affine mesh cages
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

active Stage 5 rig: nyx-stage5-rig-v01
Stage 5 path: assets/operator/nyx-redesign/experimental/stage-05/rig-v01
rig contract: assets/operator/nyx-redesign/experimental/stage-05/rig-v01/rig.json
rig freeze: assets/operator/nyx-redesign/experimental/stage-05/rig-v01/freeze.json
review metadata: assets/operator/nyx-redesign/experimental/stage-05/rig-v01/review/capture-manifest.json
review captures: contact-sheet.webp / joint-closeups.webp / static-front-revalidation.webp
```

## Stage 5 inherited-gate correction and revalidation

Stage 5 capture review exposed a previously missed **P1** in `nyx-stage2-base-v02`: the Front alpha silhouette clipped the image-right forearm/hand that is present in locked `REF-FRONT`. Because Stage 4 inherited that mask, `nyx-stage4-material-v01` also inherited the static clipping.

The defect was resolved under the workflow freeze rule rather than hidden by rigging:

- `nyx-stage2-base-v03` adds only the missing Front forearm/hand contour from locked `REF-FRONT`;
- every recorded Stage 2 proportion anchor is unchanged;
- Profile / 3/4 / Back silhouettes remain byte-for-byte inherited from `base-v02`;
- `nyx-stage4-material-v02` swaps only the Front alpha-mask authority to `base-v03`;
- Stage 4 RGB/material source pixels remain the locked Stage 1 source pixels;
- neutral visible RGB difference against the locked source is `0`;
- neutral face RGB difference is `0`;
- Stage 2 and Stage 4 gates were rerun and PASS after the local corrective.

## Stage 2 proportion anchors — frozen after revalidation

```text
head/body height: 0.139
shoulder width/body height: 0.196
torso shoulder->hip/body height: 0.231
waist Y from crown: 0.306
hip Y from crown: 0.402
waist width/body height: 0.115
hip width/body height: 0.145
leg hip->floor/body height: 0.598
footwear boot-top->floor/body height: 0.166
```

Front corrected silhouette metrics:

```text
bbox: [23, 14, 178, 592]
foreground pixels (alpha > 127): 53667
96 px check: 29 x 96, connected components: 1
```

## Stage 3 identity lock — still frozen

```text
face identity / eyes / brows / nose / lips / jaw-chin / facial width / profile: FROZEN
hairline / fringe: FROZEN
low-ponytail / long-wave shape, volume and length: FROZEN
near-black + restrained-violet major hair color structure: FROZEN
```

No Stage 5 pose applies a non-rigid face deformation. Recorded face rigid residual for mesh poses is `0 px`.

## Stage 4 appearance lock — revalidated and frozen

```text
costume paneling / major seams: FROZEN
static material value/color hierarchy: FROZEN
smoked/translucent technical-panel appearance: FROZEN
signal-core location / size / shape / color language: FROZEN
emissive placement and relative intensity: FROZEN
hands/gloves static appearance: FROZEN
footwear static appearance: FROZEN
detail hierarchy: FROZEN
```

## Stage 5 deformation proof

Actual Front captures were reviewed on a checker background and at local close-up.

```text
neutral: components 1, holes 0, alpha-area ratio 1.0000
neck +6°: components 1, holes 0, ratio 0.9991, mesh foldovers 0
shoulder/arm -30°: components 1, holes 0, ratio 0.9964
elbow -22° + wrist -6°: components 1, holes 0, ratio 0.9971
torso -4°: components 1, holes 0, ratio 0.9988, mesh foldovers 0
hip/knee weight shift: components 1, holes 0, ratio 1.0002, mesh foldovers 0
```

Local correctives retained after review:

- recover the Stage 2 Front forearm/hand static contour;
- remove detached old-arm source fragments after articulated-layer extraction by retaining only the main base component;
- fill only enclosed alpha sampling holes `<= 2 px` for the elbow/wrist proof.

No unresolved black seam, visible interpenetration, source-fragment ghost, volume collapse, accidental face deformation, or costume/body separation remains in the tested safe range.

## Frozen after Stage 5 PASS

```text
production NYX assets/runtime: FROZEN BASELINE
Stage 0 direction: FROZEN
Stage 1 references: FROZEN MASTER
Stage 2 base-v03 proportions + revalidated outer silhouettes: FROZEN
Stage 3 face/hair identity: FROZEN
Stage 4 material-v02 static appearance: FROZEN
Stage 5 neutral source mapping: FROZEN
Stage 5 front shoulder/arm segmentation + pivot + tested -30° range: FROZEN
Stage 5 front elbow/wrist segmentation + pivots + tested range: FROZEN
Stage 5 neck mesh cage + tested +6° range: FROZEN
Stage 5 torso mesh cage + tested -4° range: FROZEN
Stage 5 hip/knee weight-shift cage + tested range: FROZEN
Stage 5 corrective policies: FROZEN
```

## Allowed changes for Stage 6

- create actual timing/keyframes/interpolation for idle/breathing, attention/head behavior, blink/expression and acknowledgement gestures;
- use the Stage 5 rig only inside the tested safe ranges;
- add secondary motion only when it settles naturally and does not change static identity;
- capture every important motion and review clipping/deformation regressions;
- define reduced-motion and hidden-window motion behavior;
- make local Stage 6 timing/animation fixes that do not change frozen rig topology or neutral appearance.

## Forbidden changes for Stage 6

- extending joint ranges beyond `rig-v01/rig.json` without reopening Stage 5;
- authoring new view orientations or new deformation topology without reopening Stage 5;
- changing Stage 2 proportions/silhouettes, Stage 3 face/hair identity, or Stage 4 static appearance;
- replacing locked source pixels with newly generated art;
- modifying protected production NYX source/master/rig/runtime;
- doing Stage 7 runtime integration early;
- treating this experimental rig as production promotion.

## Remaining / deferred

- motion timing and secondary motion belong to Stage 6;
- runtime integration/performance belong to Stage 7;
- non-Front deformation is not required by the current front-facing product behavior proof; if Stage 6 introduces it, Stage 5 must reopen first;
- no experimental asset has been promoted to production.

## Next action

Open a **new chat** for Stage 6 using the `STAGE 5 -> STAGE 6` prompt in `06_STAGE_HANDOFFS.md`.

Do not begin Stage 6 in this Stage 5 chat.
