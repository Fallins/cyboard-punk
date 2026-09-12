# 04 — Work State

Last updated: **2026-09-12**

This file is the resumable state pointer. Keep it concise and current. Historical detail belongs in `05_VISUAL_REVIEW.md` and git history.

## Repository state

```text
repo: Fallins/cyboard-punk
workflow branch: feature/visual-agent-workflow
workflow base: main @ 35b2face87df9b98f052f19a7b1baf073285eac7
Stage 6 PASS head: 242712958954e04d06081b1d9ce5a151e6ca7200
Stage 7 implementation head: fd8028c775caebe87dd5a0a727b7df20944e6978
Stage 7 artifact/state commit: c7b37b364ff7d00d18d5d5f4e02208724544c8c4
```

## Current stage

```text
stage: STAGE 7 — RUNTIME INTEGRATION & PERFORMANCE
status: IN PROGRESS
Gate: NOT PASSED
next stage: STAGE 8 — FINAL QA & PROMOTION GATE (NOT AUTHORIZED YET)
```

## Current goal

Finish actual-runtime validation of `nyx-stage7-runtime-v01`. The reversible experimental integration is implemented, but Stage 7 cannot PASS until the running application is captured/reviewed against the Master References and the current performance budget is measured with an actual runtime/compositor signal.

Do **not** issue or act on the Stage 7 -> Stage 8 handoff while this Gate remains open.

## Selected direction / medium

```text
character: NYX
role: CYBOARD primary Operator / AI Signal Intelligence Operator
preferred production direction: 2D / 2.5D
Stage 2 base: 2D / 2.5D vector silhouette proxy
Stage 3 identity: locked-reference-pixel overlay
Stage 4 appearance: locked-reference-pixel appearance proxy
Stage 5 rig: hybrid articulated source-pixel layers + piecewise-affine mesh cages
Stage 6 animation: timing/keyframes on the frozen Stage 5 front-facing rig
Stage 7 experimental runtime: source-pixel SVG layer composition
production 3D runtime: NOT restored / NOT authorized
```

## Protected production baseline

Still protected and not changed by Stage 7:

```text
assets/operator/nyx/source-lock.json
assets/operator/nyx/source/master.webp
assets/operator/nyx/rig.json
docs/nyx-2.5d-asset-spec.md
src/ui/Nyx2DWebGL.tsx production renderer behavior/default path
```

Stage 6 -> current diff contains no protected NYX source/master/rig replacement and no default-renderer switch.

## Frozen upstream authorities

```text
Master reference set: nyx-stage1-master-reference-v1
Reference lock: assets/operator/nyx-redesign/references/stage-01/reference-lock.json

Stage 2 base: nyx-stage2-base-v03
Path: assets/operator/nyx-redesign/experimental/stage-02/base-v03

Stage 3 identity: nyx-stage3-face-hair-v02
Path: assets/operator/nyx-redesign/experimental/stage-03/face-hair-v02

Stage 4 appearance: nyx-stage4-material-v02
Path: assets/operator/nyx-redesign/experimental/stage-04/material-v02

Stage 5 rig: nyx-stage5-rig-v01
Path: assets/operator/nyx-redesign/experimental/stage-05/rig-v01
Rig contract: assets/operator/nyx-redesign/experimental/stage-05/rig-v01/rig.json

Stage 6 animation: nyx-stage6-anim-v01
Path: assets/operator/nyx-redesign/experimental/stage-06/anim-v01
Animation contract: assets/operator/nyx-redesign/experimental/stage-06/anim-v01/animation.json
Animation freeze: assets/operator/nyx-redesign/experimental/stage-06/anim-v01/freeze.json
Motion review: assets/operator/nyx-redesign/experimental/stage-06/anim-v01/review/motion-captures.svg
```

All Stage 0–6 frozen identity/proportion/material/rig/motion contracts remain authoritative.

## Active Stage 7 artifacts

```text
artifact: nyx-stage7-runtime-v01
runtime contract: assets/operator/nyx-redesign/experimental/stage-07/runtime-v01/runtime.json
capture checklist: assets/operator/nyx-redesign/experimental/stage-07/runtime-v01/review/capture-manifest.json
stage manifest: assets/operator/nyx-redesign/experimental/stage-07/stage-07-manifest.json

runtime selector/motion contract: src/ui/nyxStage7Experimental.ts
experimental renderer: src/ui/NyxStage7ExperimentalRuntime.tsx
managed selection/fallback: src/ui/Nyx2DManagedRuntime.tsx
performance monitor: src/ui/Nyx2DPerformanceMonitor.tsx
runtime contract tests: src/ui/nyxStage7Experimental.test.ts
managed selection/fallback tests: src/ui/Nyx2DManagedRuntime.test.tsx
monitor replacement test: src/ui/Nyx2DPerformanceMonitor.test.tsx
```

## Experimental selection and rollback contract

```text
default: production
opt-in env: VITE_NYX_EXPERIMENTAL_RUNTIME=stage7
all other values: production
production default renderer switched: NO
production NYX assets overwritten: NO
```

Failure chain:

```text
Stage 7 experimental runtime failure
  -> production Nyx2DWebGL
  -> existing OperatorStage canonical 2D fallback if production renderer also fails
```

The managed runtime is not remounted for semantic state changes. Performance monitoring now reattaches if the renderer host itself is replaced during experimental -> production fallback.

## Stage 7 state / motion mapping

The Stage 7 runtime copies the frozen Stage 6 timing/maxima rather than redefining them:

```text
idle breathing: 5000 ms loop, neck +0.55°, torso -0.55°
attention: head response ~280 ms, body response ~720 ms, neck <= 2.2°, torso <= 0.55°, gaze <= 1 source px
blink: 310 ms source-derived close/hold/reopen
success acknowledgement: 1400 ms, peak 560 ms, neck +1.6°, torso -0.9°, shoulder -14°, elbow -10°, wrist additional -3°, monotonic settle
```

Semantic mapping:

```text
idle: breathing + low target response
observing: full target response
processing: 0.92 attention scale
warning: 0.86 attention scale
success: one acknowledgement gesture; normal attention resumes outside gesture
offline: neutral static
```

## Lifecycle policy implemented

```text
reduced motion: static neutral; no continuous animation
offline: static neutral
hidden/suspended: RAF stopped; motion clock paused
resume: first resumed sample uses zero delta; hidden elapsed discarded
retarget: filtered attention state and accumulated breathing clock preserved
continuous target FPS: 24 (existing project limit <= 30 FPS)
```

Pure runtime assertions executed in the available environment confirmed that hidden elapsed does not enter the motion clock, the first resumed sample does not catch up, the acknowledgement reaches the frozen 560 ms peak, and all acknowledgement channels return to neutral at 1400 ms.

## Performance state

Authority: `docs/performance.md` and `docs/nyx-2d-checkpoint-0.25.0.md`.

Stable budget remains unchanged:

```text
draw calls <= 12
triangles <= 4400
geometries <= 12
textures <= 12
render time <= 14 ms
continuous animation <= 30 FPS
hidden: zero intentional animation frames
reduced motion: static
```

Stage 7 conservative source-layer structural accounting:

```text
draw-call equivalent: 11
triangle equivalent: 22
geometry equivalent: 11
texture sources: 2
structural numeric budget: within existing stable thresholds
```

These are **SVG source-layer equivalents, not GPU/WebGL counters**. They must not be presented as proof of render-time performance.

While Stage 7 experimental runtime is animated, runtime diagnostics intentionally publish:

```text
data-nyx2d-performance="unverified"
reason: Stage 7 render-time capture required
```

No visual-quality downgrade, lower source resolution, reduced frozen motion envelope, or hidden layer removal was used to satisfy budget numbers.

## Validation completed in this execution environment

- Restored the complete workflow state and confirmed Stage 6 PASS before editing.
- Read `docs/architecture.md`, `docs/performance.md`, the current NYX checkpoint/runtime/lifecycle/performance code, Stage 5 rig and Stage 6 motion contract/review.
- Audited Stage 6 -> Stage 7 git diff; protected production NYX assets/default renderer are not replaced.
- TypeScript `transpileModule` syntax checks passed for the new/modified Stage 7 TS/TSX files available locally.
- Pure runtime assertions passed for hidden-time discard/resume behavior and frozen acknowledgement peak/settle.
- Added project regression tests for exact opt-in, production default, fallback, semantic-state persistent mount, lifecycle motion contract, structural budget and performance-monitor renderer replacement.
- Corrected one accidental package regression found during diff audit: `@types/three ^0.180.0` remains present.

## Required validation still NOT executed

The current execution environment does not contain the repository dependency installation or a directly runnable Tauri project checkout. Therefore the following are **unverified**, not assumed PASS:

- `bun run check` in the real repository dependency environment;
- full repository Vitest suite;
- actual Vite/Tauri Stage 7 runtime smoke;
- actual runtime screenshots/captures at neutral, breathing, attention, blink and acknowledgement states;
- direct runtime comparison of those captures to the Master References and Stage 6 review capture;
- real runtime check for torso/head/arm seams, black gaps, source-fragment ghosting and blink-window artifacts;
- actual running-app hidden/reduced-motion/fallback capture;
- actual runtime console/page-error capture;
- actual render/compositor measurement against the existing `<=14 ms` stable render budget.

This missing evidence is a Stage 7 Gate blocker under `07_TOOLING_LOOP.md`; intended code and static reasoning are not valid substitutes.

## Gate state

```text
Stage 7 Gate: NOT PASSED
unresolved P0: none identified by static/code review
unresolved P1: runtime visual/performance evidence is incomplete, so Gate remains open
Stage 8 handoff authorized: NO
production promotion authorized: NO
```

## Required next action

Resume **Stage 7**, not Stage 8, in an environment that can run the project. Use the existing experimental opt-in and complete the capture manifest:

```text
VITE_NYX_EXPERIMENTAL_RUNTIME=stage7 bun run dev
bun run check
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
bun run tauri dev
```

Then capture/review the items in:

`assets/operator/nyx-redesign/experimental/stage-07/runtime-v01/review/capture-manifest.json`

Only after those checks pass, append the final Stage 7 review, mark this state `PASS`, and issue the exact `STAGE 7 -> STAGE 8` handoff from `06_STAGE_HANDOFFS.md`.
