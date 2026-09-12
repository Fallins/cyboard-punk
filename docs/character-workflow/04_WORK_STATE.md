# 04 — Work State

Status: **ACTIVE SOURCE OF TRUTH**

Last updated: 2026-09-13
Branch: `feature/visual-agent-workflow`

## Current stage

- Active stage: **STAGE 7 — RUNTIME INTEGRATION & PERFORMANCE**
- Stage 7 status: **REWORK IN PROGRESS / REAL TAURI RETEST REQUIRED**
- Stage 7 Gate: **NOT PASSED**
- Stage 8: **NOT AUTHORIZED**
- Production promotion: **NOT AUTHORIZED**
- Production default renderer: **unchanged (`Nyx2DWebGL`)**

The latest authoritative product evidence is the user's real macOS Tauri/WKWebView review. Browser/CI evidence can prove implementation regressions are fixed, but it cannot close Stage 7 without a new real-Tauri retest and real compositor/performance evidence.

## User-frozen Stage 7 placement

The current Operator-panel character scale / X / Y framing is explicitly accepted by the user and is now frozen for this rework.

- Do not redesign global placement.
- Clip/alpha/body-layer repairs must preserve the current framing.
- Only local transform overscan needed to prevent technical clipping is allowed.

## Latest real Tauri blocking defects

All remain P1 until the user revalidates the new rework in the actual Tauri/WKWebView runtime:

1. head / hair clipped;
2. left palm / fingers missing;
3. feet / boot corners missing;
4. cape incomplete / asymmetric;
5. rectangular compositing artifact near the left cape/body;
6. source/background patch around the character differs from the dashboard background;
7. blink has an unnatural patch / eyelid-closure artifact;
8. acknowledgement is rigid / mechanical;
9. idle breathing lacks visible chest / upper-chest life.

## Earlier gates

- Stage 0: PASS
- Stage 1: PASS — `nyx-stage1-master-reference-v1`
- Stage 2: PASS / revalidated — `nyx-stage2-base-v03`
- Stage 3: PASS — `nyx-stage3-face-hair-v02`
- Stage 4: PASS / revalidated — `nyx-stage4-material-v02`
- Stage 5: PASS — `nyx-stage5-rig-v01`
- Stage 6 v01: previous PASS — `nyx-stage6-anim-v01`

### Stage 6 scoped reopen for current Stage 7 rework

The latest real-runtime requirements cannot be satisfied without changing three frozen Stage 6 sub-contracts. They are therefore formally reopened rather than changed silently:

- `idleBreathing` — reopen deformation/amplitude only; **5000 ms cadence remains frozen**. New target is local chest/ribcage rise/expansion with small shoulder follow, stable waist/hips, and core translation without scale/pulse.
- `blinkConstruction` — reopen source-derived construction only; **310 ms total timing remains frozen**. The old stretched source patch is retired in favor of true eye-aperture progressive upper-lid closure.
- `acknowledgement` — reopen amplitude/timing shape inside the same **1400 ms total duration** and Stage 5 safe ranges. New motion is a restrained shoulder-led acknowledgement with delayed elbow, tiny wrist follow, short hold, and monotonic settle.

Still frozen through this scoped reopen:

- Stage 5 rig topology and tested safe ranges;
- attention 280/720 ms response and <=1 source-pixel gaze envelope;
- reduced-motion static policy;
- hidden-window pause/discard/no-catch-up policy;
- static Stage 2/3/4 identity, proportion and material locks.

Active Stage 6 revalidation candidate: `nyx-stage6-anim-v02`.
Current Stage 6 scoped revalidation state: **NOT VERIFIED / capture review pending**.

## Stage 7 rework contract

Runtime composition is being changed to:

```text
locked REF-FRONT
  × authoritative Stage 2 base-v03 silhouette
  × body-part segmentation alpha
  -> transparent isolated moving layer
  -> transform
```

Forbidden in the new path:

- raw rectangular REF-FRONT moving crops;
- cleanup rectangles used to punch source holes;
- dashboard-background-colored patching;
- paint containment / inner overflow clipping that can trim transformed hair, fingertips, cape or boots;
- moving source pixels outside the authoritative character silhouette.

Neutral regions that are not participating in motion remain the full untouched static source, especially lower body, cape and feet.

## Automated/browser validation required before real-Tauri retest

The current rework must produce and Critic-review at least:

- neutral full body;
- head close-up;
- left hand close-up;
- cape left/right close-up;
- feet/boots close-up;
- blink `0/25/50/75/100/75/50/25/0` contact sheet;
- breath exhale / mid-inhale / peak-inhale;
- exhale-vs-inhale difference image;
- acknowledgement start / mid / peak / settle;
- hidden/suspended;
- first resume frame;
- dashboard-scale Operator-panel framing;
- production fallback.

Automated assertions also check that every dynamic source image is silhouette-guarded and that no cleanup rectangle/source-background patch escapes the allowed alpha/motion envelope.

## Performance / WebKit status

Stable authority remains `docs/performance.md`:

- draw calls <= 12
- triangles <= 4400
- geometries <= 12
- textures <= 12
- sustained render/compositor time <= 14 ms
- continuous visible animation <= 30 FPS

Stage 7 target remains 24 FPS. Structural SVG-equivalent counts are not real GPU/compositor timing and cannot close the render-time Gate.

GitHub macOS 14 ARM Playwright WebKit has previously hung at `context.new_page()` before blank content. CI policy remains:

- sanity fail/hang => `status = UNAVAILABLE`, `runtimeEvidence = false`, warning/non-blocking;
- sanity passes but the actual NYX WebKit smoke fails => blocking FAIL;
- never report an unavailable runner as WebKit runtime PASS.

The authoritative WebKit-family Gate is still the user's actual macOS Tauri/WKWebView runtime.

## Protected production files

The current Stage 7 work must not modify or promote:

- `assets/operator/nyx/source-lock.json`
- `assets/operator/nyx/source/master.webp`
- `assets/operator/nyx/rig.json`
- production default `src/ui/Nyx2DWebGL.tsx`

## Next state transition

1. Complete Stage 6 v02 scoped browser/capture revalidation.
2. Complete Stage 7 Chromium capture matrix, Critic review, `bun run check`, production build, Rust scope guard/tests, opt-in/fallback/lifecycle validation and WebKit sanity classification.
3. Append new review evidence without rewriting VR-008 / VR-009.
4. Keep Stage 7 **NOT PASSED** and Stage 8 **NOT AUTHORIZED**.
5. User reruns the experimental Stage 7 path in real Tauri/WKWebView.
6. Only a successful real-runtime visual + lifecycle + <=14 ms performance revalidation may close Stage 7.
