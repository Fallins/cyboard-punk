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
stage: STAGE 2 — BASE BUILD & SILHOUETTE
status: PASS
next stage: STAGE 3 — FACE & HAIR FIDELITY
```

## Current goal

Stage 2 is complete. The locked Stage 1 character direction is now represented by a frozen additive 2D/2.5D base silhouette asset. The next chat may work only on face and hair fidelity inside the frozen Stage 2 proportion envelope.

## Selected direction summary

```text
character: NYX
role: CYBOARD primary Operator / AI Signal Intelligence Operator
archetype: cold, elegant, premium command-center woman
visual direction: NYX PRIME / Signal Director core + AURELIA high-fashion styling
preferred production direction: 2D / 2.5D
Stage 2 implementation medium: 2D / 2.5D vector silhouette proxy
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
active implementation version: nyx-stage2-base-v02
active implementation path: assets/operator/nyx-redesign/experimental/stage-02/base-v02
stage manifest: assets/operator/nyx-redesign/experimental/stage-02/stage-02-manifest.json
review capture metadata: assets/operator/nyx-redesign/experimental/stage-02/base-v02/review/capture-manifest.json
```

## Passed

- Stage 1 PASS was verified before any Stage 2 build work began;
- the Stage 1 master reference identity/direction remained unchanged;
- Stage 2 uses the preferred 2D / 2.5D route; no production 3D runtime was restored;
- `base-v01` was compared in fixed Front/Profile/3/4/Back views, critiqued, and locally corrected into `base-v02`;
- Front/Profile/3/4/Back final bounding boxes remain unchanged by the local contour cleanup;
- candidate/reference-mask IoU is `0.999580–0.999889` across the four fixed views;
- all four silhouettes remain single connected readable components at 96 px tall;
- head/body scale, shoulder width, torso length, waist placement/width, pelvis/hip placement/width, leg length, footwear height and overall silhouette meet the Stage 2 gate;
- no unresolved P0/P1 Stage 2 issue remains;
- no fine material, full face detail, rigging, animation or runtime integration was introduced;
- protected production NYX assets/runtime remain untouched.

## Stage 2 proportion anchors

Source-space construction anchors are recorded in `base-v02/base.json`. The normalized `REF-FRONT` checks are:

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

These are construction/reference anchors, not runtime rig measurements.

## Failed / unresolved

- Stage 3 face/hair implementation has not started;
- costume/material detail is intentionally deferred to Stage 4;
- no rig, animation or runtime integration is authorized yet;
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
```

Any later edit that moves these proportions or outer silhouettes reopens Stage 2 and requires regression review before downstream gates can remain valid.

## Allowed changes for next stage

- build face and hair fidelity inside the frozen Stage 2 base;
- use locked `REF-FACE`, `REF-FRONT`, `REF-3Q` and `REF-SIDE` as Stage 3 authority;
- make local-only eye/brow/nose/mouth/jaw/chin/profile/hairline/bangs/hair-volume/hair-length corrections;
- add only the face/hair structure needed by the selected 2D/2.5D medium;
- persist fixed Front/3/4/Profile face captures and review metadata;
- update `04_WORK_STATE.md` and append `05_VISUAL_REVIEW.md` after the Stage 3 gate.

## Forbidden changes for next stage

- changing Stage 2 body proportions or frozen outer silhouettes;
- redesigning the locked Stage 1 identity, hairstyle family, costume language, core motif or palette;
- modifying the protected production NYX master/source lock/rig;
- changing current runtime default or deleting fallback assets;
- doing Stage 4 material/costume polish, Stage 5 rigging, Stage 6 animation, or Stage 7 runtime integration early;
- treating any exploratory 3D work as authorization for a production 3D runtime.

## Next action

Open a **new chat** for Stage 3 using the `STAGE 2 -> STAGE 3` prompt in `06_STAGE_HANDOFFS.md`.

The Stage 3 agent must restore state from repo Source of Truth, confirm Stage 2 PASS, read the frozen areas, and preserve all Stage 2 proportions while solving only face/hair identity fidelity.

Do not begin Stage 3 in the Stage 2 chat.
