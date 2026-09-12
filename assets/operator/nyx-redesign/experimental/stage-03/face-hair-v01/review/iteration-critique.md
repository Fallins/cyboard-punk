# Stage 3 v01 Critique

Artifact: `face-hair-v01/identity-sheet.svg`  
Role: Critic  
References: `REF-FACE`, `REF-FRONT`, `REF-3Q`, `REF-SIDE`, `REF-BACK`  
Fixed views: Front, 3/4, Profile, Back hair

## Evidence

- Face/head pixels are lossless, same-size reuse of the locked neutral reference crops; no generative reinterpretation, scaling, camera, pose, or lighting change is introduced.
- The frozen Stage 2 SVG silhouettes are reused directly as the underlay and alpha mask, so v01 does not move any Stage 2 outer contour or body proportion.
- Front/3/4/Profile head windows retain the approved eyes, brows, nose, lips, jaw/chin, facial width, profile, hairline/fringe and major head-hair color structure from the locked reference set.

## Issues

1. **[P1] Hair length / volume — Profile, 3/4 and Back.**
   The first build stops the RGB identity overlay at the head/neck boundary. The approved low-ponytail/long-wave structure continues below that boundary in the locked neutral references, so v01 does not yet prove the required hair length/volume fidelity.
   - Expected: preserve the locked reference pixels for the visible ponytail/long-wave continuation without exposing unrelated Stage 4 costume/material regions.
   - Allowed fix scope: extend only the hair-provenance windows in Profile/3/4/Back; do not change the face window, Stage 2 silhouette source, body proportions, camera, crop scale, costume, or runtime.

2. **[P2] Identity-window boundary — Profile/3/4/Back.**
   A head-only rectangular cutoff is too mechanical for a long-hair identity proof.
   - Expected: shaped, view-specific continuation windows that follow only the known hair-bearing area.
   - Allowed fix scope: clip-path geometry only.

## Scores

- face identity: **96/100**
- hair fidelity: **78/100**
- Stage 2 silhouette/proportion regression: **none**

## Gate result

**FAIL — local fix required.** The unresolved P1 hair-length issue prevents Stage 3 PASS.
