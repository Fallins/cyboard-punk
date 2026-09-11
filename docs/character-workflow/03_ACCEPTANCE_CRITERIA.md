# 03 — Acceptance Criteria

Status: **ACTIVE**

No stage advances on "looks good enough" alone. Each gate below must be evaluated explicitly.

Scores are aids, not substitutes for user approval. A score cannot override a P0/P1 mismatch or an explicit user rejection.

## Severity

- **P0** — wrong character/identity, unusable artifact, destructive production regression, or impossible-to-continue structural failure.
- **P1** — obvious visual mismatch in an identity-critical or stage-critical area.
- **P2** — meaningful polish issue that does not invalidate the stage's main contract.
- **P3** — minor cosmetic opportunity.

A gate cannot PASS with unresolved P0 or P1 issues.

## Setup Gate

PASS when:

- workflow files exist;
- root `AGENTS.md` points character work to this workflow;
- current production baseline is explicitly protected;
- `04_WORK_STATE.md` identifies Stage 0 as the next stage;
- copy-ready handoff prompts exist.

## Stage 0 — Character Direction Gate

PASS when:

- 3–5 materially distinct directions have been presented;
- the user explicitly selects one direction or an explicitly merged direction;
- name/role/visual archetype are decided sufficiently to create references;
- must-preserve and must-avoid traits are recorded;
- expected production/exploration medium is recorded;
- no unresolved disagreement remains about the selected direction.

## Stage 1 — Master Reference Lock Gate

PASS when:

- required views in `02_REFERENCE_MANIFEST.md` are available;
- the same identity is consistent across all views;
- face, hair, silhouette, costume, core motif, and palette are consistent;
- neutral views are suitable for direct comparison/building;
- user explicitly approves the master reference set;
- reference paths/identifiers and hashes where possible are recorded;
- a lock policy is recorded before Stage 2 begins.

## Stage 2 — Base Build & Silhouette Gate

Required views: front, profile, 3/4, back when relevant.

PASS when:

- total-height and major landmark proportions visually match the approved neutral references;
- head/body scale, shoulder width, torso length, waist placement, pelvis/hip width, leg length, and footwear height are within an acceptable visual tolerance;
- silhouette reads as the approved character at both inspection size and intended UI scale;
- no P0/P1 proportion mismatch remains;
- implementation is structurally suitable for the selected medium;
- all passed silhouette regions are frozen.

Suggested visual score target: **>= 85/100** for silhouette/proportion, with no P1 defect.

## Stage 3 — Face & Hair Fidelity Gate

Required views: face front, 3/4, profile; hair front/side/back as relevant.

PASS when:

- face reads as the same person/character as `REF-FACE`;
- eye placement, brow, nose, lips, jaw/chin, facial width, and profile are consistent;
- hairstyle shape, volume, hairline/fringe, length, and major color structure match;
- no camera/lighting trick is masking identity defects;
- facial identity survives intended runtime display size;
- frozen Stage 2 proportions have not regressed.

Suggested visual score target: **>= 88/100** for face identity and **>= 85/100** for hair, with no P1 defect.

## Stage 4 — Costume, Materials & Detail Gate

PASS when:

- costume paneling and major seams match references;
- signature motif/core location, size, shape, and glow language match;
- material classes are distinguishable (for example matte polymer, metal, translucent/smoked areas, fabric/skin/hair as applicable);
- emissive elements enhance rather than flatten the design;
- hands/gloves and footwear are resolved;
- detail density is appropriate for both hero view and dashboard scale;
- Stage 2/3 frozen identity regions remain intact.

Suggested visual score target: **>= 85/100** for costume/material fidelity, with no P1 defect.

## Stage 5 — Rig & Deformation Gate

PASS when the selected medium requires rig/deformation and:

- neutral/rest pose remains visually faithful;
- shoulder/arm raise, elbow, wrist, hip, knee, neck, and torso motion do not create obvious collapse or black gaps;
- costume and body do not visibly separate/interpenetrate under required motions;
- face does not unintentionally distort;
- corrective shapes/weights are added where local fixes are insufficient;
- deformation tests are captured and reviewed;
- static appearance has not regressed.

For a medium without skeletal rigging, replace this gate with the equivalent layer/mesh deformation proof.

## Stage 6 — Animation & Secondary Motion Gate

PASS when required behaviors are implemented and reviewed for:

- idle/breathing;
- gaze/head attention behavior as required;
- blink/expression behavior as required;
- gesture/acknowledgement behavior as required;
- locomotion/jump only if the selected product concept needs them;
- secondary motion that settles naturally and does not look springy, detached, or perpetual;
- no clipping/deformation regressions;
- motion pauses/reduces appropriately when the app is hidden or reduced-motion is requested.

Animation quality is judged from captured motion, not only static frames.

## Stage 7 — Runtime Integration & Performance Gate

PASS when:

- integration is behind a reversible experimental path until promotion;
- current production fallback still works;
- lifecycle/mounting behavior remains correct;
- visual output matches the approved asset in runtime;
- runtime performance is measured using the project's current documented budgets rather than invented limits;
- no new blocking console/runtime errors exist;
- reduced-motion and hidden-window behavior are respected;
- relevant automated checks pass.

A performance PASS may not lower visual fidelity without explicit user approval.

## Stage 8 — Final QA & Promotion Gate

PASS requires:

- all previous gates remain valid;
- final hero and neutral comparisons are reviewed against approved references;
- required motion/deformation/runtime captures pass;
- production fallback/rollback is documented;
- no unresolved P0/P1 issue exists;
- the user explicitly chooses **PROMOTE**, **KEEP EXPERIMENTAL**, or **REJECT/REWORK**.

Only **PROMOTE** authorizes a follow-up change that replaces the current production character source or changes the default runtime path.

## Regression rule

If a later change alters a frozen area, the earlier affected gate becomes NOT VERIFIED until it is rerun. Record the regression and revalidation in `05_VISUAL_REVIEW.md`.
