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

---

## VR-005 — Stage 4 — nyx-stage4-material-v01

Date: 2026-09-12
Reviewer role: Critic / State keeper
References: `REF-FRONT`; `REF-3Q`; `REF-SIDE`; `REF-BACK`; `REF-DETAIL`; `nyx-stage2-base-v02`; `nyx-stage3-face-hair-v02`; `assets/operator/nyx-redesign/experimental/stage-04/material-v01/material.json`
Views inspected: fixed Front, 3/4, Profile, Back reference/candidate pairs; full `REF-DETAIL` local close-up authority pair; 96 px Front/3/4/Profile/Back dashboard-scale regression row

Scores (0–100 where useful):
- identity: 96 (inherited Stage 3 identity pixels unchanged)
- silhouette/proportion: 96 (inherited frozen Stage 2 masks unchanged)
- face: 97 (inherited Stage 3 lock unchanged)
- hair: 90 (inherited Stage 3 lock unchanged)
- costume/material: 98
- deformation: N/A — intentionally deferred to Stage 5
- motion: N/A
- runtime presentation: N/A

Iteration evidence:
- Stage 3 PASS was verified before any Stage 4 construction began.
- Stage 4 remains on the approved 2D/2.5D route; no production 3D runtime or current production renderer was touched.
- The Stage 4 neutral candidate does not redraw or regenerate the costume. Each locked neutral reference is reused at its exact source dimensions and clipped only by the corresponding frozen Stage 2 SVG outer silhouette using an alpha mask.
- No body/view transform, crop substitution, lens/camera change, relighting, recolor, synthetic material shader, bloom or extra emissive pass is applied.
- Because the neutral source pixels are the same locked pixels used by Stage 3, the frozen face/hair regions remain unchanged rather than being approximated again.
- `REF-DETAIL` is retained at exact 1:1 source scale in `detail-atlas.svg`; this keeps the Stage 1 authority rule for core, glove/hand, boot, material seams and micro-trim where neutral crop scale is ambiguous.
- The fixed review sheet compares the same-angle locked reference views against the candidate and preserves the Stage 3 comparison discipline.

Costume/material evidence:
- high-collar fitted black/graphite tailoring, internal paneling and major seams are source-pixel exact to the locked neutral references inside the frozen silhouette;
- matte/dark tailored surfaces, dark structural/metallic areas and smoked/translucent technical panels retain the locked value/color separation instead of being flattened by a new shader or lighting setup;
- the diamond CYBOARD signal core retains its locked location, scale, diamond geometry, cyan center and restrained violet/magenta framing;
- emissive language remains restrained because no extra glow/bloom is synthesized beyond the approved source;
- fitted gloves/hands and heeled ankle boots remain the locked neutral appearance with `REF-DETAIL` retained as local authority;
- the 96 px regression row preserves the intended readable silhouette, core/accent grouping and dark-material hierarchy at dashboard scale.

Issues:
1. [P2 / DEFERRED] The Stage 4 appearance asset is intentionally static and is not yet split into final deformable layers/meshes.
   Expected: Stage 5 introduces only the minimum segmentation/topology needed for neck/shoulder/arm/elbow/wrist/torso/hip/knee deformation while keeping this neutral static appearance visually unchanged.
   Allowed fix scope: Stage 5 deformation topology/correctives only; no costume redesign or frozen pixel/outline change.

Frozen-region regression:
- none;
- the Stage 2 silhouette files are referenced unchanged as alpha masks and were not edited;
- Stage 3 face/hair source pixels remain the same locked neutral-reference pixels at the same source scale;
- protected production NYX assets/runtime remain untouched.

Frozen after this PASS:
- costume paneling and major seams;
- static material value/color relationships;
- smoked/translucent versus matte/dark structural material hierarchy;
- diamond signal-core location, size, shape and color/glow language;
- restrained emissive placement and relative intensity;
- hands/gloves static appearance;
- footwear static appearance;
- Stage 4 detail hierarchy;
- fixed Stage 4 comparison setup.

Gate result:
- **STAGE 4 PASS**
- costume/material `98/100` >= target `85`;
- no unresolved P0/P1 Stage 4 issue remains;
- Stage 2 and Stage 3 frozen regions remain valid.

Required next action:
- Stop Stage 4. Open a new chat using the `STAGE 4 -> STAGE 5` handoff. Stage 5 may build only the deformation-ready layer/mesh structure and local correctives required by the current 2D/2.5D medium; it must preserve all Stage 2/3/4 frozen visual regions.

---

## VR-006 — Stage 5 — nyx-stage5-rig-v01

Date: 2026-09-12
Reviewer role: Critic / State keeper
References: `REF-FRONT`; `REF-FACE`; `REF-DETAIL`; `nyx-stage2-base-v03`; `nyx-stage3-face-hair-v02`; `nyx-stage4-material-v02`; `assets/operator/nyx-redesign/experimental/stage-05/rig-v01/rig.json`
Views inspected: Front neutral; neck +6°; shoulder/arm raise -30°; elbow -22° / wrist -6°; torso -4°; hip/knee weight shift; shoulder/elbow/torso/hip local close-ups; static Front revalidation

Scores (0–100 where useful):
- identity: 96
- silhouette/proportion: 96 after Stage 2 revalidation
- face: 97
- hair: 90
- costume/material: 98 after Stage 4 revalidation
- deformation: 96
- motion: N/A — timing/animation belongs to Stage 6
- runtime presentation: N/A — runtime integration belongs to Stage 7

Gate-entry evidence:
- Stage 4 was recorded PASS before Stage 5 began.
- The selected medium remains 2D / 2.5D; no production 3D runtime was restored.
- Stage 5 therefore uses the equivalent 2D/2.5D layer/mesh deformation proof required by `03_ACCEPTANCE_CRITERIA.md`.

Inherited frozen-region correction discovered during Stage 5:
1. [P1 -> FIXED / REVALIDATED] `nyx-stage2-base-v02` Front alpha mask clipped the image-right forearm/hand that is visibly present in locked `REF-FRONT`.
   Expected: neutral silhouette contains the complete locked character before deformation.
   Allowed fix scope: reopen only the affected Stage 2 Front outer silhouette, recover only the missing locked-reference contour, then rerun affected static gates.
   Fix: `nyx-stage2-base-v03` unions only the missing forearm/hand contour recovered from `REF-FRONT`; all recorded proportion anchors and Profile/3/4/Back silhouettes are unchanged.
   Revalidation: Front is one connected component at 96 px; Stage 2 proportion anchors remain unchanged; Stage 2 returns PASS.

2. [P1 -> FIXED / REVALIDATED] Stage 4 `material-v01` inherited the bad Front alpha mask.
   Expected: Stage 4 neutral uses complete locked source pixels with no static clipping.
   Allowed fix scope: switch only the Front alpha-mask source to revalidated Stage 2 base-v03.
   Fix: `nyx-stage4-material-v02`.
   Revalidation: visible neutral RGB difference against locked REF-FRONT is `0`; neutral face RGB difference is `0`; all non-Front Stage 4 views and detail authority remain unchanged; costume/material remains `98/100`; Stage 4 returns PASS.

Deformation iteration evidence:
- An initial continuous-mesh arm/elbow attempt was rejected before Gate evaluation because triangle fold-over occurred at the arm/elbow.
- A first articulated-layer attempt was rejected because old-arm source fragments remained visible behind the moved layer.
- The final structure is hybrid: mesh cages for neck/torso/hip-knee and articulated locked-source-pixel layers for shoulder/arm/elbow/wrist.
- The articulated arm-base corrective removes only the old-arm corridor and then keeps only the main body component; this eliminated 36 detached old-arm fragment pixels that caused the ghost line.
- Elbow/wrist capture originally exposed two enclosed one-pixel alpha sampling holes; the final local corrective fills only enclosed holes `<=2 px` from neighboring opaque pixels.
- No lighting, recolor, synthetic bloom, camera substitution or generated replacement art is used.

Final capture evidence:
- `neutral`: 1 component, 0 holes, alpha-area ratio `1.0000`.
- `neck +6°`: 1 component, 0 holes, alpha-area ratio `0.9991`; mesh foldovers `0`; minimum triangle-area ratio `0.5864`; face rigid residual `0 px`.
- `shoulder/arm -30°`: 1 component, 0 holes, alpha-area ratio `0.9964`; no old-arm ghost remains in checker close-up.
- `elbow -22° / wrist -6°`: 1 component, 0 holes, alpha-area ratio `0.9971`.
- `torso -4°`: 1 component, 0 holes, alpha-area ratio `0.9988`; mesh foldovers `0`; minimum triangle-area ratio `0.4276`; face rigid residual `0 px`.
- `hip/knee weight shift`: 1 component, 0 holes, alpha-area ratio `1.0002`; mesh foldovers `0`; minimum triangle-area ratio `0.7384`; face rigid residual `0 px`.
- Actual checker-background contact sheet and local joint close-ups are persisted in `rig-v01/review/`; transparent gaps cannot be hidden by the background.
- Static Front revalidation is persisted alongside the locked REF-FRONT comparison.

Critic review:
- no unresolved black seam or enclosed alpha hole;
- no obvious shoulder/elbow/wrist collapse;
- no visible costume/body separation or interpenetration in the tested safe range;
- no accidental face deformation;
- no visible volume collapse in torso or hip/knee proof;
- static face/hair/costume source pixels remain the locked identity;
- protected production NYX source/master/rig/runtime were not touched.

Scope note:
- The current product proof is front-facing. Stage 5 does not authorize non-Front deformation or locomotion.
- Stage 6 must stay inside the tested safe ranges in `rig-v01/rig.json`; a larger range, new view orientation, or new deformation topology reopens Stage 5.

Frozen-region regression:
- Stage 2 and Stage 4 were temporarily reopened only for the inherited Front alpha-mask defect described above, locally fixed, revalidated, and frozen again as `base-v03` / `material-v02`.
- Stage 3 identity was not edited.
- no production baseline regression.

Frozen after this PASS:
- revalidated Stage 2 base-v03 proportions and all four silhouettes;
- Stage 3 face/hair identity;
- revalidated Stage 4 material-v02 static appearance;
- Stage 5 neutral source mapping;
- Stage 5 front shoulder/arm, elbow/forearm and wrist/hand segmentation/pivots;
- tested neck/arm/elbow/wrist/torso/hip-knee ranges;
- Stage 5 correctives and checker-review setup.

Gate result:
- **STAGE 5 PASS**
- deformation `96/100`;
- no unresolved P0/P1 Stage 5 issue remains;
- Stage 2 and Stage 4 inherited regressions found during this stage are fixed and revalidated;
- static identity has no remaining regression;
- production runtime remains untouched.

Required next action:
- Stop Stage 5. Open a new chat using the `STAGE 5 -> STAGE 6` handoff. Stage 6 may add only animation timing/secondary motion within the frozen Stage 5 safe deformation ranges.
