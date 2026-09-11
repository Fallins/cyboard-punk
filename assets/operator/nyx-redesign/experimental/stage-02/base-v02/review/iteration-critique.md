# Stage 2 fixed-view iteration critique

## base-v01 — ITERATE

- **S2-EDGE-001 — P2 — all fixed views, strongest at Profile heel / coat hem and Front hair / footwear**
  - Evidence: raw segmentation contour retained one-source-pixel serration and tiny edge spikes.
  - Target: preserve locked proportions while producing a stable structural vector contour; bounding boxes may not move.
  - Allowed fix: local contour cleanup only. No redesign or global proportion edit.
  - Fix applied in `base-v02`: tiny enclosed noise <=20 px filled; outer contour simplified with epsilon 0.4 px.

## base-v02 — PASS

- Front, Profile, 3/4 and Back retain the same fixed-view bounding boxes as the cleaned reference-driven trace.
- Candidate/reference-mask IoU is above 0.9995 in every fixed view.
- Head/body scale, shoulder envelope, torso length, waist placement, pelvis/hip placement, leg length and footwear height remain aligned to the locked neutral references.
- At 96 px tall, each silhouette remains a single connected, readable component.
- No P0/P1 issue remains.
- No material polish, complete face detail, rigging, animation or runtime integration was introduced.
