# Stage 3 v02 Formal Critique

Artifact: `face-hair-v02/identity-sheet.svg`  
Role: Critic  
References: `REF-FACE` (face authority), `REF-FRONT`, `REF-3Q`, `REF-SIDE`, `REF-BACK`  
Fixed captures: `review/contact-sheet.svg` — REF-FACE authority, Front face, 3/4 face, Profile face, Back hair, plus 96 px full-body regression row.

## Build / local-fix trace

- v01 used exact locked neutral-reference RGB pixels only in conservative head windows over the exact frozen Stage 2 SVG silhouettes.
- v01 FAILed because the head-only windows did not prove the approved low-ponytail / long-wave continuation below the neckline in 3/4, Profile and Back.
- v02 changes only those three hair continuation clip windows. The face/head windows, source pixels, source pixel scale, Stage 2 silhouette assets, body proportions and runtime remain unchanged.
- A relative-path render blocker found before Gate evaluation was fixed without changing any visual geometry or review window.

## Face fidelity evidence

`REF-FACE` remains the authoritative facial identity. Stage 1 already locked the neutral Front/3/4/Profile crops as the same person as `REF-FACE`. Stage 3 does not redraw or regenerate them: the candidate composites the locked neutral-reference pixels at their original source size.

- **Eyes:** unchanged source pixels and placement in Front/3/4/Profile.
- **Brows:** unchanged source pixels, spacing and arch.
- **Nose:** unchanged source pixels and projection; Profile comes directly from `REF-SIDE`.
- **Mouth/lips:** unchanged source pixels, width and resting expression.
- **Jaw/chin:** unchanged reference contour inside the frozen head silhouette.
- **Facial width:** no transform or rescale is applied to the source head pixels.
- **Profile:** source projection is the locked `REF-SIDE`; no lens/camera substitution is introduced.
- **Camera/lighting masking:** none; Stage 3 uses the approved reference pixels rather than a newly lit render.

Face identity score: **97/100**. The remaining three points reflect that this Stage is a static identity-layer proof, not final Stage 5 deformation topology; there is no P1 identity mismatch.

## Hair fidelity evidence

- **Hairline/fringe:** exact locked head pixels in Front/3/4/Profile.
- **Shape/volume:** frozen Stage 2 outer hair silhouette is reused directly; v02 adds only internal locked RGB identity.
- **Length:** Profile, 3/4 and Back continuation windows now carry the locked source pixels below the neckline, addressing the v01 P1.
- **Major color structure:** near-black hair and restrained violet sheen come from the locked reference pixels with no recolor or relight.
- **Back structure:** Back capture uses `REF-BACK` source pixels inside the conservative rear-hair continuation window.

Hair fidelity score: **90/100**. The identity is visually source-locked; final deformable hair segmentation/topology is intentionally deferred to Stage 5 and is not a Stage 3 P1.

## Stage 2 regression check

- The four full-body candidates directly reuse `stage-02/base-v02/views/*.svg` as both visible underlay and alpha mask.
- No Stage 2 path data, viewBox, transform, body landmark, bounding box, shoulder/torso/waist/hip/leg/footwear measurement or outer silhouette is edited in Stage 3.
- The 96 px regression row therefore uses the exact same frozen silhouette source files that passed Stage 2.

Frozen-region regression: **none**.

## Scope / deferred work

- Any non-hair supporting pixels visible inside a conservative continuation window are **not** Stage 4 costume/material approval and are not frozen as costume authority.
- No rigging, deformation, animation or runtime integration is introduced.
- Production NYX assets/runtime remain untouched.

## Issues

1. **[P2] Future layer topology — face/hair identity is visually locked but not yet split into final deformable production meshes/layers.**
   - Expected: Stage 5 creates the minimum layer/mesh deformation structure while preserving this Stage 3 static identity.
   - Allowed fix scope later: deformation topology only; visual identity remains frozen.

No unresolved P0/P1 issue remains.

## Gate result

**STAGE 3 PASS**

- face identity: **97/100** (target >= 88)
- hair fidelity: **90/100** (target >= 85)
- Stage 2 frozen proportions: **PASS / no regression**

Required next action: freeze face/hair identity, update workflow state/review, stop, and hand off to Stage 4. Stage 4 may work only on costume/material/detail while preserving Stage 2 proportions and Stage 3 face/hair identity.
