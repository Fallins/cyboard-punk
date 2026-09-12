# 04 — Work State

Status: **ACTIVE SOURCE OF TRUTH**

Last updated: 2026-09-13
Branch: `feature/visual-agent-workflow`

## Current stage

- Active stage: **STAGE 7 — RUNTIME INTEGRATION & PERFORMANCE**
- Stage 7 status: **REWORK APPLIED / AUTOMATED + CHROMIUM REVALIDATED / REAL TAURI RETEST REQUIRED**
- Stage 7 Gate: **NOT PASSED**
- Stage 8: **NOT AUTHORIZED**
- Production promotion: **NOT AUTHORIZED**
- Production default renderer: **unchanged (`Nyx2DWebGL`)**
- Latest runtime implementation reviewed: `72f22bf420cfee3ed9edadd8fe8702b32f7d9202`
- Latest full code validation run: GitHub Actions `34710263378` (run #37)

The latest authoritative product evidence remains the user's real macOS Tauri/WKWebView review. The current rework now passes automated + Chromium capture review, but browser evidence cannot close Stage 7. A new real-Tauri retest and real compositor/performance evidence are still required.

## User-frozen Stage 7 placement

The current Operator-panel character scale / X / Y framing is explicitly accepted by the user and remains frozen.

- Do not redesign global placement.
- Clip/alpha/body-layer repairs must preserve the current framing.
- Only local transform overscan needed to prevent technical clipping is allowed.
- The 820×598 dashboard capture confirms that the rework did not intentionally move the accepted global placement.

## Latest real Tauri blocking defects

The user's latest two real-runtime reviews reported these P1 blockers. The current Chromium/browser evidence addresses each visually/structurally, but all remain **REAL TAURI RETEST PENDING** until the user revalidates the actual WKWebView path:

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
- Stage 6 v01: historical PASS — `nyx-stage6-anim-v01`
- Stage 6 v02 scoped revalidation: **PASS / RE-FROZEN** — `nyx-stage6-anim-v02`

## Stage 6 scoped reopen — resolved and re-frozen

The latest real-runtime requirements required formal local reopening of three Stage 6 sub-contracts. They were not changed silently.

### Revalidated sub-gates

- `idleBreathing`
  - 5000 ms cadence remains frozen.
  - inhale/hold/exhale/rest = approximately `40% / 8% / 45% / 7%`.
  - peak chest rise = `1.5 source px`.
  - peak local chest X scale = `1.006`.
  - peak local chest Y scale = `1.008`.
  - peak shoulder/collarbone follow = `0.8 source px`.
  - waist/hips remain stable.
  - core translates with chest rise only and does not scale/pulse.

- `blinkConstruction`
  - total timing remains `310 ms`.
  - old stretched/rectangular skin-patch construction is retired.
  - final construction uses true eye-aperture part alpha with progressive upper-lid coverage; lower lid remains effectively static and the closed lash line appears only near full closure.

- `acknowledgement`
  - total duration remains `1400 ms`.
  - final peak: shoulder `-8°`, elbow `-4.8°`, wrist follow `-0.7°`.
  - shoulder leads, elbow follows, wrist is intentionally tiny, then the motion settles monotonically with no overshoot, repeated waving, spring or oscillation.
  - final Chromium Critic caught an initial wrist/source ghost during iteration; explicit upper-arm/forearm/hand part alpha plus the wrist accessory segmentation removed it before PASS.

### Still frozen through the scoped reopen

- Stage 5 rig topology and tested safe ranges;
- attention 280/720 ms response and <=1 source-pixel gaze envelope;
- reduced-motion static policy;
- hidden-window pause/discard/no-catch-up policy;
- static Stage 2/3/4 identity, proportion and material locks.

Stage 5 was **not** reopened.

## Stage 7 composition contract after rework

Runtime composition now follows:

```text
locked REF-FRONT
  × authoritative Stage 2 base-v03 silhouette
  × body-part segmentation alpha
  -> transparent isolated moving layer
  -> transform
```

The Stage 2 authoritative front paths are inlined from the build-time SVG source so WKWebView does not depend on external-SVG mask behavior.

Removed/forbidden from the final rework path:

- raw rectangular REF-FRONT moving crops;
- cleanup rectangles used to punch source holes;
- dashboard-background-colored patching;
- experimental paint containment / inner overflow clipping that can trim transformed hair, fingertips, cape or boots;
- moving source pixels outside the authoritative character silhouette.

Neutral regions that are not participating in motion keep the full untouched static source, especially lower body, cape and feet.

## Automated + Chromium evidence — PASS

Validated at code commit `72f22bf420cfee3ed9edadd8fe8702b32f7d9202`, GitHub Actions run `34710263378`:

- `bun run check`: PASS;
- experimental production build: PASS;
- Rust backend scope guard: PASS;
- Rust format baseline: PASS;
- Rust clippy baseline: PASS;
- Rust tests: PASS;
- exact Stage 7 opt-in guard: PASS;
- production default renderer remains unchanged: PASS;
- Chromium runtime capture matrix: PASS;
- page/console errors: none;
- reduced-motion static path: PASS;
- hidden/suspended + first-resume no-catch-up lifecycle: PASS;
- experimental failure -> production fallback: PASS.

Final Chromium evidence:

- neutral/reference pixels above delta 8: `0`;
- dashboard neutral/reference pixels above delta 8: `0`;
- neutral source/background contamination outside allowed silhouette: `0 px`;
- acknowledgement source/background contamination outside allowed motion envelope: `0 px`;
- every dynamic source image is authoritative-silhouette guarded;
- black cleanup rectangles: none;
- rectangular part clips: none except the progressive blink-coverage helper;
- breath exhale-vs-peak changed pixels above delta 8: `1799`, localized to the intended upper-body deformation;
- hidden state reports `suspended`; first resume returns `animated` without attention/head discontinuity.

## Manual Chromium Critic review — PASS for browser evidence only

The final required capture matrix was manually inspected, not merely accepted from green tests:

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
- 820×598 dashboard framing;
- fallback capture.

Final browser Critic result:

- no head/hair, palm/finger, feet/boot or cape clipping seen;
- no rectangular source/background patch seen;
- blink closes progressively without the prior large skin tile;
- breathing is visibly localized to chest/upper chest with stable lower body;
- acknowledgement is restrained and shoulder-led; the wrist-accessory ghost found during an earlier browser iteration is gone;
- no black seam, ghost limb, obvious deformation collapse or frozen static regression seen;
- user-approved global placement was not redesigned.

This is **browser evidence only** and does not overrule the earlier real-Tauri failure.

## Performance / WebKit status

Stable authority remains `docs/performance.md`:

- draw calls <= 12
- triangles <= 4400
- geometries <= 12
- textures <= 12
- sustained render/compositor time <= 14 ms
- continuous visible animation <= 30 FPS

Stage 7 target remains 24 FPS. Current SVG source-layer-equivalent accounting is `11 / 22 / 11 / 2`, within the structural budgets, but these are not real WKWebView GPU/compositor counters. Real Tauri render/compositor time remains **UNVERIFIED**.

### GitHub Playwright WebKit

For run `34710263378` the WebKit workflow job completed successfully only because the known runner limitation is intentionally classified non-blocking. The actual sentinel is:

- `status = UNAVAILABLE`
- `runtimeEvidence = false`
- runner: `macos-14-arm64`
- Playwright WebKit: frozen macOS 14 ARM `v2251`
- sanity progress reaches browser launch and context creation, then hangs before a blank `context.new_page()` can be created.

Therefore WebKit CI is **UNAVAILABLE**, not PASS and not a NYX product FAIL. The authoritative WebKit-family Gate remains the user's actual macOS Tauri/WKWebView runtime.

## Protected production files

The current Stage 7 work does not modify or promote:

- `assets/operator/nyx/source-lock.json`
- `assets/operator/nyx/source/master.webp`
- `assets/operator/nyx/rig.json`
- production default `src/ui/Nyx2DWebGL.tsx`

## Remaining Gate work

Stage 7 remains **NOT PASSED** until the user reruns the actual experimental Tauri/WKWebView path and confirms all of the following together:

- head/hair complete;
- left hand/palm/fingers complete;
- feet/boots complete;
- cape complete/symmetric;
- no rectangular/background source artifact;
- blink natural;
- acknowledgement natural;
- chest/upper-chest breathing clearly perceptible;
- hidden/resume lifecycle normal;
- real Tauri/WKWebView performance satisfies the existing `<=14 ms` render/compositor Gate without hidden quality degradation.

Until then:

- Stage 7 Gate = **NOT PASSED**;
- Stage 8 = **NOT AUTHORIZED**;
- production promotion = **NOT AUTHORIZED**;
- do **not** issue a Stage 7 -> Stage 8 handoff.
