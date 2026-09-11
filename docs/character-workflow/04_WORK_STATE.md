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
stage: STAGE 4 — COSTUME, MATERIALS & DETAIL
status: PASS
next stage: STAGE 5 — RIG & DEFORMATION
```

## Current goal

Stage 4 is complete. Static costume/material/core/detail appearance is now frozen on top of the frozen Stage 2 proportion envelope and Stage 3 face/hair identity. The next chat may create only the minimum 2D/2.5D layer/mesh segmentation and deformation structure required for motion, while preserving the neutral static result exactly enough to keep Stages 2–4 valid.

## Selected direction summary

```text
character: NYX
role: CYBOARD primary Operator / AI Signal Intelligence Operator
archetype: cold, elegant, premium command-center woman
visual direction: NYX PRIME / Signal Director core + AURELIA high-fashion styling
preferred production direction: 2D / 2.5D
Stage 2 implementation medium: 2D / 2.5D vector silhouette proxy
Stage 3 implementation medium: 2D / 2.5D locked-reference-pixel identity overlay
Stage 4 implementation medium: 2D / 2.5D locked-reference-pixel appearance proxy
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

These remain the rollback baseline.

## Current artifact

```text
active redesign direction: NYX stage0-direction-v1
active reference set: nyx-stage1-master-reference-v1
reference lock: assets/operator/nyx-redesign/references/stage-01/reference-lock.json
frozen Stage 2 base: nyx-stage2-base-v02
Stage 2 base path: assets/operator/nyx-redesign/experimental/stage-02/base-v02
frozen Stage 3 identity: nyx-stage3-face-hair-v02
Stage 3 identity path: assets/operator/nyx-redesign/experimental/stage-03/face-hair-v02
active implementation version: nyx-stage4-material-v01
active implementation path: assets/operator/nyx-redesign/experimental/stage-04/material-v01
stage manifest: assets/operator/nyx-redesign/experimental/stage-04/stage-04-manifest.json
material contract: assets/operator/nyx-redesign/experimental/stage-04/material-v01/material.json
detail atlas: assets/operator/nyx-redesign/experimental/stage-04/material-v01/detail-atlas.svg
review capture metadata: assets/operator/nyx-redesign/experimental/stage-04/material-v01/review/capture-manifest.json
fixed review sheet: assets/operator/nyx-redesign/experimental/stage-04/material-v01/review/contact-sheet.svg
```

## Passed

- Stage 3 PASS and every inherited Stage 2/3 frozen region were verified before Stage 4 work began;
- Stage 4 stayed on the approved 2D/2.5D path and did not restore a production 3D runtime;
- every neutral Stage 4 view reuses the locked Stage 1 reference RGB pixels at exact source dimensions and is clipped only by the corresponding frozen Stage 2 SVG silhouette as an alpha mask;
- there is no Stage 4 body transform, proportion edit, outer-contour edit, camera substitution, relighting, recolor, synthetic bloom or glow filter;
- Stage 3 face/hair identity remains unchanged because Stage 4 uses the same locked neutral-reference source pixels at the same source scale rather than repainting or transforming identity regions;
- `REF-DETAIL` is retained at 1:1 in the Stage 4 detail atlas as local authority for signal core, glove/hand, boot, material seams and micro-detail where it does not conflict with neutral identity views;
- costume paneling and major seams, high-fashion black/graphite tailoring, smoked/translucent technical areas, dark structural material, restrained emissive accents, diamond core, fitted gloves and heeled ankle boots meet the Stage 4 static fidelity contract;
- fixed Front/3/4/Profile/Back reference comparisons, local detail comparison and a 96 px dashboard-scale regression row are persisted in the Stage 4 review sheet;
- costume/material fidelity score is `98/100`;
- no unresolved P0/P1 Stage 4 issue remains;
- Stage 2 and Stage 3 remain valid with no frozen-region regression;
- protected production NYX assets/runtime remain untouched;
- no rigging/deformation, animation or runtime integration was introduced.

## Stage 2 proportion anchors — still frozen

Source-space construction anchors remain recorded in `stage-02/base-v02/base.json`. The normalized `REF-FRONT` checks remain:

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

Any change to these or the frozen outer silhouettes reopens Stage 2.

## Stage 3 identity lock — still frozen

Authoritative lock metadata: `assets/operator/nyx-redesign/experimental/stage-03/face-hair-v02/identity.json` and `freeze.json`.

```text
face: adult refined semi-realistic NYX identity from REF-FACE / same Stage 1 source sheet
expression: cool, composed resting read
features: eyes / brows / nose / lips / jaw-chin / facial width / profile FROZEN
hair: refined low ponytail + long elegant waves FROZEN
hairline/fringe: FROZEN
hair volume/length: FROZEN
major hair color structure: near-black + restrained violet sheen FROZEN
fixed Stage 3 comparison setup: FROZEN
```

Any later visual edit to these regions reopens Stage 3.

## Stage 4 appearance lock

Authoritative lock metadata: `assets/operator/nyx-redesign/experimental/stage-04/material-v01/material.json` and `freeze.json`.

```text
costume paneling / major seams: FROZEN
static material value + color relationships: FROZEN
smoked/translucent technical-panel appearance: FROZEN
dark metallic / graphite / matte-black hierarchy: FROZEN
diamond CYBOARD signal-core location / size / shape / color language: FROZEN
restrained cyan / violet / selective-magenta emissive placement and relative intensity: FROZEN
hands / fitted gloves static appearance: FROZEN
heeled ankle-boot static appearance: FROZEN
detail hierarchy at inspection and 96 px dashboard scale: FROZEN
fixed Stage 4 comparison setup: FROZEN
```

Stage 5 may introduce segmentation/topology only if the neutral static pixels and all inherited frozen boundaries remain visually unchanged. Any later visual change to the Stage 4 appearance contract reopens Stage 4.

## Failed / unresolved

- the current Stage 4 appearance proof is static; deformable layer/mesh segmentation and corrective structure are intentionally deferred to Stage 5;
- no rig/deformation system exists for the redesign yet;
- no animation or runtime integration is authorized yet;
- no experimental asset has been promoted to production.

## Frozen areas

```text
current production NYX assets and runtime: FROZEN BASELINE
Stage 0 selected identity/direction: FROZEN CONTRACT
Stage 1 master references: FROZEN MASTER — nyx-stage1-master-reference-v1
Stage 2 head/body scale: FROZEN
Stage 2 shoulder width: FROZEN
Stage 2 torso length: FROZEN
Stage 2 waist placement and width: FROZEN
Stage 2 pelvis/hip placement and width: FROZEN
Stage 2 leg length: FROZEN
Stage 2 footwear height: FROZEN
Stage 2 Front/Profile/3/4/Back outer silhouettes: FROZEN
Stage 3 face identity / feature relationships: FROZEN
Stage 3 profile identity: FROZEN
Stage 3 hairline/fringe: FROZEN
Stage 3 low-ponytail / long-wave shape, volume and length: FROZEN
Stage 3 major hair color structure: FROZEN
Stage 4 costume paneling / major seams: FROZEN
Stage 4 static material value/color hierarchy: FROZEN
Stage 4 signal core / emissive language: FROZEN
Stage 4 hands/gloves appearance: FROZEN
Stage 4 footwear appearance: FROZEN
Stage 4 detail hierarchy: FROZEN
```

## Allowed changes for next stage

- create the minimum 2D/2.5D layer or mesh segmentation needed for deformation while preserving the frozen static pixels;
- define neutral/rest deformation structure and local pivots/meshes for neck, shoulders/arms, elbows/wrists, torso, hips/knees and other actually required joints;
- add local corrective masks/meshes only when needed to prevent gaps, clipping, volume collapse or costume separation;
- capture neutral and deformation tests against the Stage 4 static appearance;
- make local-only Stage 5 fixes that do not redesign costume, face/hair or body proportions;
- update state/review only after the Stage 5 gate.

## Forbidden changes for next stage

- changing Stage 2 body proportions, landmark ratios or frozen outer silhouettes;
- redrawing, regenerating, rescaling or redesigning the frozen Stage 3 face/hair identity;
- changing Stage 4 costume paneling, material/color hierarchy, core/emissive language, glove or footwear appearance to make rigging easier;
- replacing locked reference pixels with newly generated art without reopening the affected visual stage;
- modifying the protected production NYX master/source lock/rig;
- changing current runtime default or deleting fallback assets;
- doing Stage 6 animation or Stage 7 runtime integration early;
- treating any experimental 3D work as authorization for a production 3D runtime.

## Next action

Open a **new chat** for Stage 5 using the `STAGE 4 -> STAGE 5` prompt in `06_STAGE_HANDOFFS.md`.

The Stage 5 agent must restore state from repo Source of Truth, confirm Stage 4 PASS, preserve every Stage 2/3/4 frozen visual region, and build only the deformation-ready structure required by the current 2D/2.5D medium.

Do not begin Stage 5 in the Stage 4 chat.
