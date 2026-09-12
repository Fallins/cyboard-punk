# 04 — Work State

Last updated: **2026-09-12**

This file is the resumable state pointer. Keep it concise and current. Historical detail belongs in `05_VISUAL_REVIEW.md` and git history.

## Repository state

```text
repo: Fallins/cyboard-punk
workflow branch: feature/visual-agent-workflow
workflow base: main @ 35b2face87df9b98f052f19a7b1baf073285eac7
Stage 6 PASS head: 242712958954e04d06081b1d9ce5a151e6ca7200
Stage 7 final automated-validation head: 0fb4cd495f790d4efbab58f0d4b1c02b98c0bb6d
Stage 7 latest successful CI run: 34680061489
```

## Current stage

```text
stage: STAGE 7 — RUNTIME INTEGRATION & PERFORMANCE
status: AUTOMATED VALIDATION PASS / TAURI REAL-RUNTIME VALIDATION PENDING
Gate: NOT PASSED
next stage: STAGE 8 — FINAL QA & PROMOTION GATE (NOT AUTHORIZED YET)
```

## Current goal

Only the final real-application validation remains. The experimental Stage 7 integration, repository checks, Rust tests, browser runtime captures, lifecycle checks and visual Critic fixes are complete. Stage 7 cannot be marked PASS until the opt-in path is reviewed in the actual Tauri/WKWebView application on a real Mac and actual render/compositor performance is measured against the current stable budget.

Do **not** issue or act on the Stage 7 -> Stage 8 handoff while this Gate remains open.

## Selected direction / frozen authorities

```text
character: NYX
preferred production direction: 2D / 2.5D
Stage 2 base: nyx-stage2-base-v03
Stage 3 identity: nyx-stage3-face-hair-v02
Stage 4 appearance: nyx-stage4-material-v02
Stage 5 rig: nyx-stage5-rig-v01
Stage 6 animation: nyx-stage6-anim-v01
Stage 7 experimental runtime: nyx-stage7-runtime-v01
production 3D runtime: NOT restored / NOT authorized
```

All Stage 0–6 frozen identity/proportion/material/rig/motion contracts remain authoritative.

## Protected production baseline

Still protected and not changed by Stage 7:

```text
assets/operator/nyx/source-lock.json
assets/operator/nyx/source/master.webp
assets/operator/nyx/rig.json
docs/nyx-2.5d-asset-spec.md
src/ui/Nyx2DWebGL.tsx production renderer behavior/default path
```

A CI scope guard compares Stage 6 PASS -> current head and confirms Stage 7 did not modify `src-tauri`.

## Experimental selection and rollback contract

```text
default: production
opt-in env: VITE_NYX_EXPERIMENTAL_RUNTIME=stage7
all other values: production
production default renderer switched: NO
production NYX assets overwritten: NO
```

Failure chain remains:

```text
Stage 7 experimental runtime failure
  -> production Nyx2DWebGL
  -> existing OperatorStage canonical 2D fallback if production renderer also fails
```

## Frozen Stage 6 motion copied into Stage 7

```text
idle breathing: 5000 ms loop, neck +0.55°, torso -0.55°
attention: head response ~280 ms, body response ~720 ms, neck <= 2.2°, torso <= 0.55°, gaze <= 1 source px
blink: 310 ms source-derived close/hold/reopen
success acknowledgement: 1400 ms, peak 560 ms, neck +1.6°, torso -0.9°, shoulder -14°, elbow -10°, wrist additional -3°, monotonic settle
continuous target FPS: 24
```

Lifecycle policy:

```text
reduced motion: static neutral; no continuous animation
offline: static neutral
hidden/suspended: RAF stopped; motion clock paused
resume: first resumed sample uses zero delta; hidden elapsed discarded
retarget: filtered attention state and accumulated breathing clock preserved
```

## Automated validation — PASS

Latest authority:

```text
GitHub Actions workflow: Stage 7 macOS Validation
run: 34680061489
validated head: 0fb4cd495f790d4efbab58f0d4b1c02b98c0bb6d
result: SUCCESS
```

Completed successfully:

- `bun run check` — PASS.
- Vitest — **60 test files / 297 tests PASS**.
- experimental production build — PASS.
- Stage 7 `src-tauri` scope guard — PASS; no Stage 7 Rust backend changes.
- Tauri icon generation — PASS.
- Rust tests — **49 library tests + 2 binary tests PASS**.
- real Chromium Stage 7 capture harness — PASS.
- runtime console/page-error capture — no errors.
- opt-in/default-renderer guard — PASS.

Repository-wide rustfmt drift and seven `clippy -D warnings` findings were also observed, but the Stage 7 scope guard proves they predate and are outside the Stage 7 visual/runtime diff. They are recorded as baseline debt, not silently fixed by unrelated character work.

## Runtime capture / Critic evidence

Final browser-runtime evidence from Run 10:

```text
neutral + reduced-motion:
  lifecycle: static / reduced-motion
  neck/torso/gaze/blink: exact neutral
  changed pixels > delta 8 vs locked neutral reference: 0
  max channel delta: 1

processing + cursor attention:
  neck: +2.024°
  torso: -0.505°
  gaze: +0.92 source px

hidden/resume:
  lifecycle switches to suspended while hidden
  motion state preserved
  resume returns to animated without catch-up delta

blink:
  captured closure: 1.000

acknowledgement:
  active peak captured
  settles back to ack=idle
```

Manual Critic review caught real composition defects during the validation loop rather than accepting the first green test result:

1. blink eye-window patch artifacts;
2. old-arm/source-fragment ghosting during acknowledgement.

Both were fixed locally inside the Stage 7 SVG composition without changing Stage 5 rig ranges or Stage 6 timing/maxima. Final Run 10 capture was re-reviewed at the runtime scale and the reviewed blink/arm artifacts are no longer blocking.

## Performance state

Stable project budget remains unchanged:

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

Stage 7 source-layer structural accounting:

```text
draw-call equivalent: 11
triangle equivalent: 22
geometry equivalent: 11
texture sources: 2
target FPS: 24
```

The structural counts are inside the existing numeric limits, but they are SVG/source-layer equivalents rather than GPU/WebGL counters. The browser harness reports only source/runtime submission diagnostics. It is **not** accepted as proof of the actual Tauri/WKWebView compositor/render cost, so the runtime intentionally remains marked `unverified` for that metric.

## Remaining Stage 7 Gate blockers

Only real-application evidence remains:

1. run the Stage 7 opt-in path in the actual Tauri/WKWebView application on a real Mac;
2. confirm the final NYX pixels and lifecycle/fallback behavior in that running application;
3. measure actual render/compositor performance against the existing `<=14 ms` stable budget.

These are not substituted with Chromium headless evidence because `07_TOOLING_LOOP.md` requires the real runtime for the final Gate.

## Gate state

```text
Stage 7 automated validation: PASS
Stage 7 Gate: NOT PASSED — awaiting Tauri real-runtime evidence
unresolved implementation P0/P1: none from automated/browser Critic review
remaining P1 evidence gap: real Tauri/WKWebView visual + compositor/performance validation
Stage 8 handoff authorized: NO
production promotion authorized: NO
```

## Required next action

On the real Mac checkout of this branch, run only the remaining real-application validation path:

```bash
git checkout feature/visual-agent-workflow
git pull
bun install
VITE_NYX_EXPERIMENTAL_RUNTIME=stage7 bun run tauri dev
```

Review the real Tauri window for neutral/breathing, cursor attention, blink, acknowledgement, reduced-motion, hide/resume and fallback. Capture the final runtime/performance evidence required by `assets/operator/nyx-redesign/experimental/stage-07/runtime-v01/review/capture-manifest.json`.

After that evidence is supplied and no P0/P1 remains, append the final Stage 7 review, mark Stage 7 PASS, and only then issue the exact `STAGE 7 -> STAGE 8` handoff from `06_STAGE_HANDOFFS.md`.
