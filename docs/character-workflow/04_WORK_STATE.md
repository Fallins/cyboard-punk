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
stage: STAGE 1 — MASTER REFERENCE LOCK
status: PASS
next stage: STAGE 2 — BASE BUILD & SILHOUETTE
```

## Current goal

Stage 1 is complete. The Stage 0 NYX redesign is now represented by a user-approved, immutable master reference set. The next chat may build only the base asset/model and silhouette against these locked references.

## Selected direction summary

```text
character: NYX
role: CYBOARD primary Operator / AI Signal Intelligence Operator
archetype: cold, elegant, premium command-center woman
core personality: cool/focused/professional at work; warmer, playful, coquettish/sensual/teasing in direct user interaction
visual direction: NYX PRIME / Signal Director core + AURELIA high-fashion styling
locked hair: refined low ponytail + long elegant waves, near-black with restrained violet sheen
body/silhouette: elegant mature hourglass tendency, defined waist, balanced bust/hips, long graceful legs, high-end sensuality without aggressive exaggeration
costume: fitted black/graphite high-fashion operator tailoring, high collar, long coat tails, smoked/sheer technical panels, fitted gloves, heeled ankle boots
core: cyan-centered diamond signal core with restrained violet/magenta framing
preferred production direction: 2D / 2.5D, subject to later gates
approved exploration: 2D / 2.5D / 3D reference or build exploration; no runtime migration authorized
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
active implementation version: NONE
```

## Passed

- workflow and production-baseline safety are in place;
- Stage 0 identity/direction is explicitly approved and frozen;
- all Stage 1 required views exist: hero, neutral front, side, back, 3/4, face close-up and detail sheet;
- all required views derive from one approved character sheet, preventing cross-generation identity drift;
- face, hair, silhouette, costume, core motif and palette are mutually consistent;
- neutral views are suitable for direct Stage 2 comparison;
- no unresolved P0/P1 Stage 1 issue remains;
- user explicitly approved the master set (`行就他吧`);
- reference paths, hashes, authority rules and lock policy are persisted.

## Failed / unresolved

- no Stage 2 base asset/model exists yet;
- proportions/silhouette have not yet been proven in an implementation artifact;
- no rig, animation or runtime integration is authorized yet;
- no experimental medium has been promoted to production.

## Frozen areas

```text
current production NYX assets and runtime: FROZEN BASELINE
Stage 0 selected identity/direction: FROZEN CONTRACT
Stage 1 master references: FROZEN MASTER — nyx-stage1-master-reference-v1
```

A later change to face identity, selected hairstyle, silhouette language, costume language, core motif or palette reopens Stage 1 and invalidates downstream visual gates until re-approved.

## Allowed changes for next stage

- create an additive experimental base asset/model;
- choose an implementation/build technique compatible with the approved medium constraints;
- adjust only base proportions and silhouette to match `REF-FRONT`, `REF-SIDE`, `REF-BACK` and `REF-3Q`;
- use fixed comparison views and local proportion fixes;
- persist Stage 2 review captures/metadata;
- update `04_WORK_STATE.md` and append `05_VISUAL_REVIEW.md`.

## Forbidden changes for next stage

- regenerating, editing or replacing the locked Stage 1 reference set;
- changing NYX face identity, selected low-ponytail/long-wave hairstyle, costume language, core motif or palette;
- replacing/modifying the protected production NYX master/source lock/rig;
- changing current runtime default;
- deleting current fallback assets;
- doing final material/detail polish before silhouette passes;
- rigging, animation or runtime integration;
- treating exploratory 3D work as authorization for a production 3D runtime.

## Next action

Open a **new chat** for Stage 2 using the `STAGE 1 -> STAGE 2` prompt in `06_STAGE_HANDOFFS.md`.

The Stage 2 agent must read the locked references and confirm Stage 1 PASS before building anything. It must first solve head/body scale, shoulders, torso, waist, pelvis/hips, leg length, footwear height and overall silhouette with fixed front/profile/3/4 views (and back when relevant).

Do not begin Stage 2 in the Stage 1 chat.
