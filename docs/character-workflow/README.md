# CYBOARD Character Visual Workflow

Status: **ACTIVE WORKFLOW / SOURCE-OF-TRUTH INDEX**

This directory defines how ChatGPT or another coding/visual agent must design, build, review, resume, and eventually promote a CYBOARD Operator character without relying on long chat history.

The workflow is intentionally state-driven. A new chat must be able to resume correctly after reading the files listed below, even if all previous conversational context is unavailable.

## Required read order

Before any character design, image generation, modeling, rigging, animation, renderer, or visual QA work, read in this order:

1. `/AGENTS.md`
2. `00_AGENT_PROTOCOL.md`
3. `01_CHARACTER_DIRECTION.md`
4. `02_REFERENCE_MANIFEST.md`
5. `03_ACCEPTANCE_CRITERIA.md`
6. `04_WORK_STATE.md`
7. the latest entry in `05_VISUAL_REVIEW.md`
8. `07_TOOLING_LOOP.md`
9. only then inspect the assets/code referenced by `04_WORK_STATE.md`

Do not substitute chat memory for this read sequence.

## Source-of-truth priority

When information conflicts, use this order:

1. User's newest explicit instruction
2. Approved master visual references recorded in `02_REFERENCE_MANIFEST.md`
3. Approved character direction in `01_CHARACTER_DIRECTION.md`
4. Acceptance gates in `03_ACCEPTANCE_CRITERIA.md`
5. Current state in `04_WORK_STATE.md`
6. Latest visual review entry
7. Existing implementation/assets
8. Agent aesthetic preference

Agent preference always loses to an approved reference.

## Production baseline versus exploration

The current NYX 2D production asset remains a protected fallback. The existing `assets/operator/nyx/source-lock.json`, master, rig, and renderer must not be overwritten during exploration.

Redesign work may explore 2D, 2.5D, or 3D techniques in isolated assets. An experimental medium does **not** authorize a runtime architecture change. Only Stage 8 (Promotion Gate), followed by explicit user approval, may replace or supersede the production character pipeline.

## Stage model

- **Setup** — workflow files exist and state is initialized.
- **Stage 0 — Character Direction** — decide whether to retain/reinterpret NYX or introduce a new Operator design; approve one direction.
- **Stage 1 — Master Reference Lock** — create and approve a consistent visual reference set.
- **Stage 2 — Base Build & Silhouette** — build the base asset/model and lock proportions/silhouette.
- **Stage 3 — Face & Hair Fidelity** — refine identity-critical face and hair.
- **Stage 4 — Costume, Materials & Detail** — finish clothing, surfaces, emissive elements, and detail hierarchy.
- **Stage 5 — Rig & Deformation** — prove motion-ready structure without visual collapse.
- **Stage 6 — Animation & Secondary Motion** — create and validate the required behavior set.
- **Stage 7 — Runtime Integration & Performance** — integrate behind a safe experimental path and validate runtime budgets.
- **Stage 8 — Final QA & Promotion Gate** — compare against references, check regressions, and decide whether to promote.

One chat should normally own one stage. At the end of every stage, the agent must update `04_WORK_STATE.md`, append a review when relevant, and print the exact copy-ready prompt for the next chat from `06_STAGE_HANDOFFS.md`.

## Stage transition rule

A stage transition is legal only when all are true:

- current stage gate is PASS;
- `04_WORK_STATE.md` records the PASS and frozen areas;
- required artifacts/references are persisted or explicitly recorded as pending blockers;
- latest visual review has no unresolved P0/P1 issue for that gate;
- the agent outputs the next-chat prompt and tells the user to start a new chat.

If a gate fails, remain in the current stage. Do not create a handoff that pretends the next stage is ready.

## Roles

### Builder
Implements only the changes allowed by `04_WORK_STATE.md`.

### Critic
Compares the output with approved references and acceptance criteria. The Critic identifies deltas and returns PASS/FAIL. It does not broaden the design or silently fix unrelated areas.

### State keeper
Updates `04_WORK_STATE.md` and `05_VISUAL_REVIEW.md` so the next chat does not need historical context.

The same model may perform these roles sequentially, but it must explicitly switch roles. For important visual gates, a fresh chat should begin by auditing the previous stage before proceeding.

## Definition of success

Success is not "a character exists" or "the file renders." Success means the approved visual identity survives implementation, motion, and runtime constraints and passes every required gate without relying on conversational memory.
