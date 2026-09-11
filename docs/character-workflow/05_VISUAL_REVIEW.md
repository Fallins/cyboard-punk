# 05 — Visual Review Log

Status: **APPEND-ONLY REVIEW HISTORY**

Do not rewrite old reviews to make later work look cleaner. Append corrections and revalidations.

## Review entry template

```markdown
## VR-XXX — <stage> — <artifact/version>

Date:
Reviewer role: Critic
References:
Views inspected:

Scores (0–100 where useful):
- identity:
- silhouette/proportion:
- face:
- hair:
- costume/material:
- deformation:
- motion:
- runtime presentation:

Issues:
1. [P0/P1/P2/P3] <region> — <specific delta/evidence>
   Expected:
   Allowed fix scope:

Frozen-region regression:
- none / describe

Gate result:
- PASS / FAIL / NOT APPLICABLE

Required next action:
- ...
```

## Review rules

- Use the smallest evidence set that proves the issue, but include all required gate views.
- Scores without written evidence are not sufficient for a FAIL or PASS.
- A PASS with an unresolved P0/P1 issue is invalid.
- If the user rejects an output, record the gate as FAIL regardless of the agent's score.
- If a frozen area changes, record the regression and reopen the affected earlier gate.

---

## VR-000 — Setup — workflow initialization

Date: 2026-09-12
Reviewer role: State keeper
References: existing CYBOARD repository contracts and protected NYX production baseline
Views inspected: N/A

Issues:
- [P1] New character direction has not been selected; therefore no new reference or implementation is authorized yet.

Frozen-region regression:
- none

Gate result:
- **SETUP PASS**

Required next action:
- Start Stage 0 in a new chat and choose the future CYBOARD Operator direction before creating a new master reference set.

---

## VR-001 — Stage 0 — nyx-stage0-direction-v1

Date: 2026-09-12
Reviewer role: State keeper / Critic
References: `docs/brand.md`, protected production NYX baseline, Stage 0 direction candidates, explicit user selection
Views inspected: conceptual direction only; no Stage 1 master visual set exists yet

Decision evidence:
- Multiple materially different character directions were presented during Stage 0.
- The user rejected robot/synthetic-first directions and clarified that the desired character must be beautiful, elegant, cool, sexy, well-proportioned, and emotionally human.
- The user explicitly selected direction 1 (`NYX PRIME / Signal Director`) as the core and direction 3 (`AURELIA`) as the styling/silhouette influence.
- The user explicitly approved the styling family of long waves, refined low ponytail, or clean sophisticated updo, with an attractive but non-aggressive silhouette focused on high-end sensuality.
- The selected identity therefore remains NYX but is a substantial redesign rather than a requirement to reproduce the protected production appearance.

Approved identity summary:
- mature, refined, semi-realistic female Operator;
- cold, focused, controlled and professional during work;
- warmer, playful, coquettish, sensual and teasing during direct user interaction;
- premium high-fashion operator styling rather than battle armor;
- attractive mature feminine proportions with elegant hourglass tendency and long graceful leg line;
- premium sensuality rather than aggressive, vulgar, combat-first, idol, mascot, or robotic presentation;
- CYBOARD signal/core visual language remains part of the identity;
- 2D / 2.5D is the preferred production direction for later validation, while 3D remains allowed for exploration/reference only unless a later Promotion Gate authorizes more.

Issues:
- No unresolved P0/P1 issue remains for the Stage 0 direction gate.
- Exact hairstyle, facial details, proportions, costume construction, core placement, and palette balance remain intentionally open for Stage 1 visual reference comparison; these are refinements inside the approved identity, not Stage 0 blockers.

Frozen-region regression:
- none; protected production NYX assets and runtime were not modified.

Gate result:
- **STAGE 0 PASS**

Required next action:
- Start Stage 1 in a new chat using the `STAGE 0 -> STAGE 1` handoff. Build and compare a consistent master reference set, obtain explicit user approval, record the locked references in `02_REFERENCE_MANIFEST.md`, and stop before Stage 2.

---

## VR-002 — Stage 1 — nyx-stage1-master-reference-v1

Date: 2026-09-12
Reviewer role: Critic / State keeper
References: `docs/character-workflow/01_CHARACTER_DIRECTION.md`, `docs/brand.md`, `assets/operator/nyx-redesign/references/stage-01/reference-lock.json`
Views inspected: hero, neutral front, neutral side, neutral back, neutral 3/4, face close-up, detail sheet

Scores (0–100 where useful):
- identity: 94
- silhouette/proportion: 91
- face: 94
- hair: 92
- costume/material: 90
- deformation: N/A
- motion: N/A
- runtime presentation: N/A

Evidence:
- The same adult refined semi-realistic NYX identity reads across the hero, neutral views and face panel.
- The refined low-ponytail/long-wave hair system is consistent across front/profile/back/3/4 and resolves the Stage 0 hairstyle family.
- Body relationships remain coherent: elegant hourglass tendency, defined waist, balanced bust/hips and a long graceful leg line without aggressive exaggeration.
- High-collar fitted black/graphite operator tailoring, long coat tails, gloves and heeled ankle boots repeat throughout the set.
- The cyan/violet/magenta diamond signal core and restrained CYBOARD palette repeat throughout the set.
- `REF-DETAIL` confirms the core, glove/hand, boot, material seams and rear hair structure.
- Neutral panels are suitable for direct build comparison; background/presentation treatment does not define proportions.
- The user explicitly approved the complete set with `行就他吧`.

Issues:
1. [P3] Costume micro-trim/seam detail can read slightly differently at very small crop scale.
   Expected: use `REF-DETAIL` as authority for local material/trim while neutral views remain authority for silhouette.
   Allowed fix scope: downstream implementation only under the authority rules; do not regenerate the reference set.

Frozen-region regression:
- none; the protected production NYX baseline was not modified.

Gate result:
- **STAGE 1 PASS**

Required next action:
- Freeze `nyx-stage1-master-reference-v1`, open a new Stage 2 chat, and build only the base/silhouette against the locked neutral references. Do not begin Stage 2 in this chat.

---

## VR-003 — Stage 2 — nyx-stage2-base-v02

Date: 2026-09-12
Reviewer role: Critic / State keeper
References: `nyx-stage1-master-reference-v1`; `REF-FRONT`; `REF-SIDE`; `REF-3Q`; `REF-BACK`; `assets/operator/nyx-redesign/experimental/stage-02/base-v02/base.json`
Views inspected: fixed Front, Profile, 3/4, Back; 96 px intended-UI-scale silhouette check

Scores (0–100 where useful):
- identity: 94 (reference identity preserved; no redesign performed)
- silhouette/proportion: 96
- face: N/A — intentionally deferred to Stage 3
- hair: N/A for internal fidelity; Stage 1 outer hair silhouette preserved
- costume/material: N/A — intentionally deferred to Stage 4
- deformation: N/A
- motion: N/A
- runtime presentation: N/A

Iteration evidence:
- `base-v01` was built as a reference-driven structural silhouette trace from the locked neutral views.
- Critique found one P2 contour-quality issue: one-source-pixel raster serration/tiny spikes around hair, coat hems, gloves and high-heel footwear. No major proportion delta was found.
- The allowed local fix only filled tiny enclosed segmentation noise <=20 px and simplified the outer contour at epsilon 0.4 source px; no global regeneration or redesign occurred.
- `base-v02` retained the same candidate bounding box in every required view.
- Candidate/reference-mask IoU after the local fix is Front `0.999829`, Profile `0.999580`, 3/4 `0.999889`, Back `0.999704`.
- At 96 px tall, all four fixed-view silhouettes remain a single connected readable component.

Proportion evidence from locked `REF-FRONT` construction anchors:
- head/body height ratio: `0.139`;
- shoulder width/body height: `0.196`;
- torso shoulder-to-hip/body height: `0.231`;
- waist Y from crown: `0.306` and waist width/body height: `0.115`;
- hip Y from crown: `0.402` and hip width/body height: `0.145`;
- leg hip-to-floor/body height: `0.598`;
- footwear boot-top-to-floor/body height: `0.166`.

Issues:
1. [P2 -> FIXED] contour edge micro-jaggedness in `base-v01`.
   Expected: stable vector silhouette with no material change to the locked proportions.
   Allowed fix scope: local contour cleanup only.
   Result: fixed in `base-v02`; fixed-view bounding boxes unchanged and minimum IoU remains above `0.9995`.

Frozen-region regression:
- none; Stage 0 direction and Stage 1 master identity/reference contract remain unchanged;
- protected production NYX assets/runtime were not modified.

Frozen after this PASS:
- head/body scale;
- shoulder width;
- torso length;
- waist placement and width;
- pelvis/hip placement and width;
- leg length;
- footwear height;
- Front/Profile/3/4/Back outer silhouettes.

Gate result:
- **STAGE 2 PASS**
- no unresolved P0/P1 Stage 2 issue remains.

Required next action:
- Stop Stage 2. Open a new chat using the `STAGE 2 -> STAGE 3` handoff. Stage 3 may work only on face/hair fidelity and must not move any Stage 2 frozen proportion or outer-silhouette region.

---

## VR-004 — Stage 3 — nyx-stage3-face-hair-v02

Date: 2026-09-12
Reviewer role: Critic / State keeper
References: `REF-FACE`; `REF-FRONT`; `REF-3Q`; `REF-SIDE`; `REF-BACK`; `nyx-stage2-base-v02`; `assets/operator/nyx-redesign/experimental/stage-03/face-hair-v02/identity.json`
Views inspected: fixed REF-FACE authority panel; Front face; 3/4 face; Profile face; Back hair; 96 px Front/3/4/Profile/Back full-body regression row

Scores (0–100 where useful):
- identity: 96
- silhouette/proportion: 96 (inherited frozen Stage 2 source, unchanged)
- face: 97
- hair: 90
- costume/material: N/A — intentionally deferred to Stage 4
- deformation: N/A — final layer/mesh topology intentionally deferred to Stage 5
- motion: N/A
- runtime presentation: N/A

Iteration evidence:
- Stage 2 PASS and all frozen proportion/outer-silhouette regions were verified before Stage 3 work began.
- Stage 3 uses the preferred 2D/2.5D route and does not restore a production 3D runtime.
- Identity-critical face/hair regions are not redrawn or regenerated. The build reuses the locked Stage 1 neutral-reference RGB pixels at their original source scale over the frozen Stage 2 silhouette base.
- `face-hair-v01` kept exact face/head pixels but used head-only windows. Critic marked a P1 because the approved low-ponytail/long-wave continuation below the neckline was not sufficiently proven in 3/4, Profile and Back.
- `face-hair-v02` applies only the allowed local fix: shaped hair-provenance continuation windows in 3/4, Profile and Back. The Front face/head window, source pixel scale, cameras/crops, Stage 2 base and runtime remain unchanged.
- A relative-path render blocker was caught before Gate evaluation and fixed without changing visual geometry.

Face evidence:
- `REF-FACE` remains authoritative; Stage 1 already confirmed that the neutral Front/3/4/Profile views are the same identity as the face close-up.
- eye placement/shape, brow placement/arch, nose, lips, jaw/chin, facial width and the cool composed resting expression are preserved from locked pixels rather than approximated;
- Profile projection comes directly from locked `REF-SIDE` pixels;
- no candidate relighting, lens change, camera change or new generative render is used to mask identity defects.

Hair evidence:
- hairline/fringe and head-hair color structure are exact locked pixels;
- the frozen Stage 2 outer hair silhouette remains unchanged;
- v02 extends the locked source pixels through the required 3/4/Profile/Back continuation regions so low-ponytail/long-wave length and volume are represented;
- the near-black base and restrained violet sheen remain the locked reference color structure, with no recolor.

Issues:
1. [P1 -> FIXED] v01 hair length/volume continuation below neckline was incomplete.
   Expected: prove the locked low-ponytail/long-wave continuation without touching face or Stage 2 body/silhouette.
   Allowed fix scope: 3/4/Profile/Back hair clip windows only.
   Result: fixed in `face-hair-v02`.

2. [P2] Final deformable layer/mesh topology is not solved in Stage 3.
   Expected: Stage 5 creates the minimum deformation structure while preserving this static identity exactly.
   Allowed fix scope: later deformation topology only; Stage 3 visual identity remains frozen.

Frozen-region regression:
- none; the Stage 3 candidates directly reuse the exact Stage 2 SVG silhouettes as underlay and alpha mask;
- no Stage 2 path data, viewBox, transform, body landmark, bounding box or proportion anchor was changed;
- protected production NYX assets/runtime were not modified.

Frozen after this PASS:
- Stage 3 face identity across Front/3/4/Profile;
- eye/brow/nose/lip relationships;
- jaw/chin and facial width;
- profile identity;
- hairline/fringe;
- refined low-ponytail / long-wave identity;
- hair shape/volume/length;
- near-black + restrained violet major hair color structure;
- fixed Stage 3 comparison setup.

Gate result:
- **STAGE 3 PASS**
- face `97/100` >= target `88`;
- hair `90/100` >= target `85`;
- no unresolved P0/P1 Stage 3 issue remains;
- Stage 2 frozen proportions remain valid.

Required next action:
- Stop Stage 3. Open a new chat using the `STAGE 3 -> STAGE 4` handoff. Stage 4 may work only on costume/material/detail and must preserve all frozen Stage 2 proportions and Stage 3 face/hair identity.
