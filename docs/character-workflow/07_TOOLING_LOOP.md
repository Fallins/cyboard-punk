# 07 — Tooling and Visual Loop Strategy

Status: **ACTIVE**

This workflow borrows the useful part of modern agentic visual-production loops: establish a visual target, implement, capture the real output, compare, apply a local fix, and repeat. Tool choice is secondary to the loop discipline.

## 1. Do not confuse agent, generator, DCC, and renderer

Different tools solve different layers:

- **Agent** — plans, edits files/scripts, orchestrates iterations, records state.
- **Image generator** — creates concept/master visual targets or local visual alternatives.
- **3D generator** — may create starting geometry for selected parts; output is not automatically production-ready.
- **DCC (for example Blender)** — assembly, topology/shape refinement, materials, rigging, animation, rendering.
- **Runtime renderer** — the actual CYBOARD presentation path.
- **Critic** — compares captures to approved references and acceptance criteria.

A polished result usually comes from coordinating these layers, not asking one model to produce a finished hero character in one step.

## 2. Preferred iteration pattern

```text
Reference lock
  -> choose one scoped problem
  -> implement
  -> render/capture with fixed preset
  -> compare reference vs output
  -> write concrete deltas
  -> freeze unaffected regions
  -> apply local fix
  -> repeat
```

Never use "regenerate everything" as the default fix after identity regions have passed.

## 3. Character generation strategy

### Concept stage

Use image generation aggressively enough to explore genuinely different directions, but compare candidates with similar framing/background so art-direction noise does not decide the winner.

### Reference stage

Generate/prepare multiple views. Consistency matters more than cinematic presentation. If necessary, iterate each view against a locked face/body/costume description until the set agrees.

### 3D exploration, if selected

Prefer part-aware construction when it reduces failure coupling. For example, face/head, hair, body/costume, and accessories may be solved separately and then assembled/refined. Do not assume a one-shot full-body 3D generation will preserve face, body proportions, costume topology, and rig suitability simultaneously.

After assembly, review fixed orthographic/perspective presets before rigging. Rigging a wrong shape only makes a wrong shape harder to change.

### 2D/2.5D exploration, if selected

Preserve the approved master's visible RGB identity. Layer extraction/deformation must not make the static character visibly worse than the master. Identity-critical face regions should use conservative transforms unless a split/deformation is proven lossless.

## 4. Fixed capture presets

For every stage, record enough information to reproduce comparison captures.

For 3D this should include, as applicable:

- camera transform;
- projection/lens;
- character pose;
- light rig/world;
- render engine/settings;
- background;
- resolution.

For 2D this should include:

- canvas/crop;
- scale;
- background;
- state/pose;
- animation timestamp if relevant.

Changing the capture setup to make an iteration look better invalidates direct comparison.

## 5. Critic checklist

The Critic asks in this order:

1. Is this still the approved character?
2. Is silhouette/proportion correct?
3. Is the face correct?
4. Are hair/costume signature shapes correct?
5. Are materials/values/colors correct?
6. Are there structural artifacts, clipping, gaps, or deformation failures?
7. Does motion preserve identity and weight?
8. Does runtime presentation preserve the approved result?

Do not start with tiny texture/detail complaints while identity or silhouette is still wrong.

## 6. Iteration naming

Use stable version labels in state/reviews, for example:

```text
concept-c03
reference-r02
base-v07
face-v12
material-v05
rig-v04
anim-v06
runtime-v03
```

A version means a reviewable artifact, not every tiny save.

## 7. Tool failures and capability limits

If the current ChatGPT session cannot directly operate a required tool or persist a binary artifact:

- do not pretend the action occurred;
- produce the exact script/instructions/artifact that can be generated safely;
- record the blocker in `04_WORK_STATE.md`;
- keep the stage FAIL/IN PROGRESS until the actual output can be reviewed.

Never mark a visual gate PASS based only on intended code or a textual description of what the render should look like.

## 8. Runtime promotion

The experimental artifact and the production renderer are separate concerns. A 3D exploration can still result in a 2D/2.5D production asset if that is the best runtime solution. Likewise, a beautiful standalone Blender render does not justify a runtime migration by itself.

Stage 8 decides promotion based on fidelity, motion, runtime cost, maintainability, and rollback safety together.
