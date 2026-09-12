# 04 — Work State

Last updated: **2026-09-13**

This file is the resumable state pointer. Keep it concise and current. Historical detail belongs in `05_VISUAL_REVIEW.md` and git history.

## Repository state

```text
repo: Fallins/cyboard-punk
workflow branch: feature/visual-agent-workflow
workflow base: main @ 35b2face87df9b98f052f19a7b1baf073285eac7
Stage 6 PASS head: 242712958954e04d06081b1d9ce5a151e6ca7200
Stage 7 post-Tauri visual-fix head: eaba05d4970cfb0eca7a9e7c1253e4d0e2211a2e
Stage 7 latest CI/tooling head: 3eb53b8ee32a687082c5c0fc0dfc9d037d06529b
latest diagnostic run used for Chromium/WebKit evidence: 34706250465
```

## Current stage

```text
stage: STAGE 7 — RUNTIME INTEGRATION & PERFORMANCE
status: REAL TAURI FAIL / REWORK APPLIED / REAL TAURI RETEST PENDING
Gate: NOT PASSED
next stage: STAGE 8 — FINAL QA & PROMOTION GATE (NOT AUTHORIZED)
production promotion authorized: NO
```

## Current truth

The experimental Stage 7 path has already been tested once in the actual macOS Tauri/WKWebView application. That real-runtime review **FAILED** and overrides earlier browser-only green results.

User-supplied real Tauri screen recording identified four stage-critical P1 defects:

1. character position/framing was wrong in the Operator panel;
2. the head was visibly clipped/missing in runtime;
3. one hand was visibly clipped/missing in runtime;
4. blink presentation looked wrong.

Stage 7 must not be marked PASS until the post-fix branch is rerun in the actual Tauri application and these four defects are confirmed resolved.

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

All Stage 0–6 frozen identity/proportion/material/rig/motion contracts remain authoritative. The Stage 7 rework is integration-only and does not authorize redesigning them.

## Protected production baseline

Still protected and not replaced by Stage 7:

```text
assets/operator/nyx/source-lock.json
assets/operator/nyx/source/master.webp
assets/operator/nyx/rig.json
docs/nyx-2.5d-asset-spec.md
src/ui/Nyx2DWebGL.tsx production renderer/default path
```

CI scope guards continue to confirm Stage 7 does not modify `src-tauri`.

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
attention: head ~280 ms, body ~720 ms, neck <= 2.2°, torso <= 0.55°, gaze <= 1 source px
blink: 310 ms source-derived close/hold/reopen
success acknowledgement: 1400 ms, peak 560 ms, neck +1.6°, torso -0.9°, shoulder -14°, elbow -10°, wrist -3°, monotonic settle
target FPS: 24
```

Lifecycle policy remains:

```text
reduced motion: static neutral
offline: static neutral
hidden/suspended: RAF stopped; motion clock paused
resume: first sample uses zero delta; hidden elapsed discarded
retarget: filtered attention state and breathing phase preserved
```

## Post-Tauri-failure rework applied

The real-runtime failure was analyzed against extracted frames from the user recording. Stage 7 integration was then locally reworked without changing Stage 5 safe ranges or Stage 6 timing contracts.

Applied fixes include:

- dynamic head/torso/arm layers are no longer clipped by a static outer neutral-silhouette mask;
- silhouette masking now travels with the dynamic head/torso layer where needed, preserving neutral fidelity while avoiding rotation-time clipping;
- experimental SVG sizing was made explicit (`absolute` / `inset` / full host sizing) to remove browser/WebKit intrinsic-SVG layout ambiguity that contributed to bad framing;
- acknowledgement keeps the Stage 5-style old-arm cleanup so moved arm/hand layers do not reveal stale source fragments;
- blink no longer uses the earlier nested-SVG stretch/rectangular patch technique; it is constrained to conservative eye apertures using locked source pixels plus restrained eyelid/lash treatment;
- the browser harness now includes an 820×598 dashboard-scale capture instead of validating only the 302×648 construction canvas.

These changes are **post-fix evidence only until actual Tauri revalidation**.

## Automated / Chromium evidence after rework

Repeated macOS CI has continued to pass the relevant frontend/build/Rust checks, including:

- `bun run check` — PASS;
- Vitest — 60 files / 297 tests PASS;
- experimental production build — PASS;
- Stage 7 `src-tauri` scope guard — PASS;
- Rust tests — 49 library + 2 binary tests PASS;
- Chromium Stage 7 runtime capture — PASS;
- opt-in/default-renderer guard — PASS.

Post-fix Chromium Critic evidence shows:

- neutral/reduced-motion remains effectively pixel-identical to locked neutral source;
- head is complete in captured neutral/attention frames;
- both hands are present in captured acknowledgement evidence;
- blink no longer shows the original large stretched eye patch from the user recording;
- hidden/resume lifecycle remains no-catch-up;
- dashboard-scale evidence is now produced at 820×598.

This Chromium evidence does **not** close the real Tauri Gate.

## Playwright WebKit CI — tooling unavailable, not product evidence

A dedicated minimal probe was added because GitHub Actions WebKit repeatedly appeared to hang before Stage 7 cases could run.

On `macos-14-arm64`, Playwright `1.62.0` with its frozen WebKit `v2251` build produced this sequence:

```text
webkit launch: PASS
new_context: PASS
context.new_page(): HANG / watchdog timeout
application content loaded: NO
```

The hang occurs even for a blank sanity page before NYX/Vite application content is involved. Therefore this CI WebKit environment is recorded as **UNAVAILABLE** and is not accepted as either a product PASS or product FAIL. The workflow now emits an explicit unavailable artifact/warning instead of letting this infrastructure defect permanently fail Stage 7.

Actual Tauri/WKWebView remains the authoritative WebKit-family runtime evidence.

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

Stage 7 source-layer structural accounting remains:

```text
draw-call equivalent: 11
triangle equivalent: 22
geometry equivalent: 11
texture sources: 2
target FPS: 24
```

These are SVG/source-layer equivalents, not actual WKWebView compositor counters. Actual Tauri render/compositor timing remains unverified and may not be replaced with fabricated JS submission time.

## Remaining Stage 7 Gate blockers

1. Pull the latest branch and rerun the Stage 7 opt-in path in the real macOS Tauri/WKWebView application.
2. Confirm the four real-runtime P1 defects are resolved: framing/position, complete head, complete hands, natural blink.
3. Reconfirm neutral/breathing, attention, acknowledgement, reduced-motion and hide/resume do not regress.
4. Measure actual Tauri/WKWebView render/compositor performance against the existing `<=14 ms` stable budget.

## Gate state

```text
initial real Tauri result: FAIL
post-fix automated Chromium result: PASS
Playwright WebKit CI: UNAVAILABLE BEFORE APP CONTENT
post-fix real Tauri retest: PENDING
Stage 7 Gate: NOT PASSED
Stage 8 handoff authorized: NO
production promotion authorized: NO
```

## Required next action

On the real Mac checkout, after the current CI settles, run only:

```bash
git checkout feature/visual-agent-workflow
git pull
VITE_NYX_EXPERIMENTAL_RUNTIME=stage7 bun run tauri dev
```

No full local CI rerun is required from the user. In the actual Operator panel, check only the final framing/position, head, both hands (especially acknowledgement), blink, and hide/resume. If those pass, capture the final Tauri performance evidence. Only after all remaining evidence passes may Stage 7 be marked PASS and the Stage 7 -> Stage 8 handoff be issued.
