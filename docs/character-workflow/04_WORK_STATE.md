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
stage: STAGE 0 — CHARACTER DIRECTION
status: PASS
next stage: STAGE 1 — MASTER REFERENCE LOCK
```

## Current goal

Create and approve a consistent master reference set for the Stage 0 selected NYX redesign before any base build, final modeling, rigging, animation, or runtime integration begins.

The selected direction is defined in `01_CHARACTER_DIRECTION.md` and must be treated as the Stage 1 identity contract.

## Selected direction summary

```text
character: NYX
role: CYBOARD primary Operator / AI Signal Intelligence Operator
archetype: cold, elegant, premium command-center woman
core personality: cool/focused/professional at work; warmer, playful, coquettish/sensual/teasing in direct user interaction
visual direction: NYX PRIME / Signal Director core + AURELIA high-fashion styling
body/silhouette: attractive mature feminine proportions, elegant hourglass tendency, high-end sensuality without aggressive or vulgar emphasis
hair family for Stage 1 comparison: long elegant waves / refined low ponytail / clean sophisticated updo
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
active redesign asset: NONE
active reference set: NONE
active implementation version: NONE
```

## Passed

- workflow branch created;
- state-driven workflow defined;
- production baseline protected from redesign exploration;
- stage acceptance gates defined;
- new-chat handoff protocol defined;
- Stage 0 presented materially different character directions;
- user explicitly selected a merged NYX redesign direction;
- role, visual archetype, personality contrast, body/silhouette language, costume direction, palette, motif intent, and medium direction are recorded;
- Stage 0 has no unresolved P0/P1 disagreement.

## Failed / unresolved

- no new master reference set exists yet;
- exact master hairstyle is not yet selected from the approved Stage 0 family;
- exact face, proportions, costume construction, core placement, and palette balance are not yet visually locked;
- no implementation medium has been promoted for production.

## Frozen areas

```text
current production NYX assets and runtime: FROZEN BASELINE
Stage 0 selected identity/direction: FROZEN CONTRACT
Stage 1 master references: NOT YET FROZEN
```

Stage 1 may refine the approved direction but may not silently redesign the character. A material identity change requires reopening Stage 0.

## Allowed changes for next stage

- Stage 1 concept/reference images and comparison sheets;
- additive exploration/reference asset directories;
- refinement within the approved face/body/hair/costume/core/palette boundaries in `01_CHARACTER_DIRECTION.md`;
- `02_REFERENCE_MANIFEST.md` to record and lock the approved master set;
- `04_WORK_STATE.md`;
- `05_VISUAL_REVIEW.md`;
- documentation needed to reproduce the selected references.

## Forbidden changes for next stage

- replacing or modifying the protected production NYX master/source lock/rig;
- changing current runtime default;
- deleting current fallback assets;
- silently changing the Stage 0 archetype into a robot, mascot, combatant, idol, or materially different identity;
- beginning final base modeling/build, rigging, animation, or runtime integration before Stage 1 passes;
- treating exploratory 3D work as authorization for a 3D production runtime.

## Next action

Open a **new chat** for Stage 1 using the `STAGE 0 -> STAGE 1` prompt in `06_STAGE_HANDOFFS.md`.

The Stage 1 agent must audit this state and `01_CHARACTER_DIRECTION.md`, then create/compare a consistent master reference set covering hero, neutral front, side, back, 3/4, face close-up, and detail views. The user must explicitly approve the master reference set before Stage 1 can PASS.

Do not begin Stage 2 in the Stage 1 chat.
