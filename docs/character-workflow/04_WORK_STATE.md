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
stage: SETUP
status: PASS
next stage: STAGE 0 — CHARACTER DIRECTION
```

## Current goal

Establish a persistent visual-agent workflow, then deliberately reconsider the CYBOARD Operator character before any new implementation. The new design may retain NYX, redesign NYX, or become a new Operator identity.

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
active redesign asset: NONE
active reference set: NONE
active implementation version: NONE
```

## Passed

- workflow branch created;
- state-driven workflow defined;
- production baseline protected from redesign exploration;
- stage acceptance gates defined;
- new-chat handoff protocol defined.

## Failed / unresolved

- no new character direction selected yet;
- no new master reference set exists yet;
- no implementation medium has been approved for production.

## Frozen areas

```text
current production NYX assets and runtime: FROZEN BASELINE
new character design: NOT FROZEN
```

## Allowed changes for next stage

- character concept documents;
- concept/reference images or design attachments;
- `01_CHARACTER_DIRECTION.md`;
- `02_REFERENCE_MANIFEST.md` only to record concept candidates, not to lock masters prematurely;
- `04_WORK_STATE.md`;
- `05_VISUAL_REVIEW.md`;
- additive exploration assets/directories.

## Forbidden changes for next stage

- replacing current production NYX master;
- editing the existing source lock as if the redesign were already approved;
- changing current runtime default;
- deleting current rig/assets;
- beginning final modeling/rigging/animation before Stage 0 and Stage 1 pass.

## Next action

Open a **new chat** for Stage 0 using the `SETUP -> STAGE 0` prompt in `06_STAGE_HANDOFFS.md`.

The Stage 0 agent must first audit this state, inspect relevant CYBOARD branding/current NYX references, then present 3–5 materially different character directions for user selection. It must stop after Stage 0 PASS and output the Stage 1 prompt.
