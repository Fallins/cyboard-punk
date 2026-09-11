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
stage: STAGE 3 — FACE & HAIR FIDELITY
status: PASS
next stage: STAGE 4 — COSTUME, MATERIALS & DETAIL
```

## Current goal

Stage 3 is complete. Face/hair identity is now frozen on top of the frozen Stage 2 proportion envelope. The next chat may work only on costume, materials, signature core/motif, hands/gloves, footwear and Stage 4 detail while preserving all Stage 2 proportions and the Stage 3 face/hair identity.

## Selected direction summary

```text
character: NYX
role: CYBOARD primary Operator / AI Signal Intelligence Operator
archetype: cold, elegant, premium command-center woman
visual direction: NYX PRIME / Signal Director core + AURELIA high-fashion styling
preferred production direction: 2D / 2.5D
Stage 2 implementation medium: 2D / 2.5D vector silhouette proxy
Stage 3 implementation medium: 2D / 2.5D locked-reference-pixel identity overlay
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
active implementation version: nyx-stage3-face-hair-v02
active implementation path: assets/operator/nyx-redesign/experimental/stage-03/face-hair-v02
stage manifest: assets/operator/nyx-redesign/experimental/stage-03/stage-03-manifest.json
review capture metadata: assets/operator/nyx-redesign/experimental/stage-03/face-hair-v02/review/capture-manifest.json
fixed review sheet: assets/operator/nyx-redesign/experimental/stage-03/face-hair-v02/review/contact-sheet.svg
```

## Passed

- Stage 2 PASS was verified before any Stage 3 work began;
- Stage 3 used `REF-FACE` as face authority and locked `REF-FRONT`, `REF-3Q`, `REF-SIDE`, `REF-BACK` as neutral identity/hair sources;
- no face or hair regeneration was used; identity-critical pixels are lossless reuse of the locked Stage 1 neutral reference pixels at source scale;
- `face-hair-v01` preserved face identity but FAILed the hair gate because head-only windows did not prove the low-ponytail/long-wave continuation below the neckline;
- `face-hair-v02` locally extended only the 3/4, Profile and Back hair-provenance clip windows;
- fixed Front/3/4/Profile face captures and Back hair capture are persisted in the Stage 3 review sheet;
- eyes, brows, nose, lips, jaw/chin, facial width and profile remain the approved identity with no camera/lighting substitution;
- hairline/fringe, overall volume, low-ponytail/long-wave length and near-black/violet major color structure meet the Stage 3 gate;
- face identity score is `97/100` and hair fidelity score is `90/100`;
- the Stage 3 candidate directly reuses the frozen Stage 2 SVG silhouettes as underlay and alpha mask, with no Stage 2 path/viewBox/transform/body-landmark edits;
- no unresolved P0/P1 Stage 3 issue remains;
- protected production NYX assets/runtime remain untouched;
- no costume/material approval, rigging, animation or runtime integration was introduced.

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

## Stage 3 identity lock

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

## Failed / unresolved

- Stage 4 costume/material/detail implementation has not started;
- the Stage 3 visual identity proof is static; final deformable face/hair layer or mesh topology remains intentionally deferred to Stage 5;
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
Stage 3 face identity / feature relationships: FROZEN
Stage 3 profile identity: FROZEN
Stage 3 hairline/fringe: FROZEN
Stage 3 low-ponytail / long-wave shape, volume and length: FROZEN
Stage 3 major hair color structure: FROZEN
```

Any later edit to a Stage 3 identity region reopens Stage 3 and requires fixed Front/3/4/Profile face plus relevant hair regression review. Any edit to inherited Stage 2 proportions/outer silhouettes also reopens Stage 2.

## Allowed changes for next stage

- implement costume structure and major paneling inside the frozen Stage 2 silhouette;
- implement material classes and restrained emissive treatment from locked references;
- resolve the diamond CYBOARD signal/core motif;
- resolve hands/gloves and footwear detail;
- use locked neutral/detail references and fixed comparison captures;
- make local-only Stage 4 fixes without changing Stage 2 proportions or Stage 3 face/hair identity;
- persist Stage 4 review metadata and update state/review only after the Stage 4 gate.

## Forbidden changes for next stage

- changing Stage 2 body proportions or frozen outer silhouettes;
- redrawing, regenerating, rescaling or redesigning the frozen Stage 3 face/hair identity;
- changing the locked Stage 1 identity, hairstyle family, costume language, core motif or palette premise;
- modifying the protected production NYX master/source lock/rig;
- changing current runtime default or deleting fallback assets;
- doing Stage 5 rigging, Stage 6 animation, or Stage 7 runtime integration early;
- treating any exploratory 3D work as authorization for a production 3D runtime.

## Next action

Open a **new chat** for Stage 4 using the `STAGE 3 -> STAGE 4` prompt in `06_STAGE_HANDOFFS.md`.

The Stage 4 agent must restore state from repo Source of Truth, confirm Stage 3 PASS, preserve every Stage 2/3 frozen region, and work only on costume/material/detail fidelity.

Do not begin Stage 4 in the Stage 3 chat.
