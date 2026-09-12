# NYX Stage 2 — base-v02 (PASS)

`base-v02` is the frozen Stage 2 base asset for the additive `nyx-redesign` experiment. The chosen medium is **2D / 2.5D**, matching `01_CHARACTER_DIRECTION.md`; this directory does **not** restore or promote a production 3D runtime.

## Scope

Only proportion and silhouette structure is represented here. The four fixed views are reference-driven vector silhouette proxies at the exact locked source viewBoxes. No fine material treatment, complete face construction, animation, rig, or runtime integration is included.

## Iteration

`base-v01` retained minor raster-edge chatter. `base-v02` applies a local-only contour cleanup (epsilon `0.4 px`, plus tiny enclosed noise fill <= `20 px`). Final candidate/reference-mask IoU is 0.999580–0.999889; every fixed-view bounding box is unchanged. All four silhouettes remain a single readable component when evaluated at 96 px tall.

## Frozen after Stage 2 PASS

Head/body scale, shoulder width, torso length, waist placement/width, pelvis/hip placement/width, leg length, footwear height, and the Front/Profile/3/4/Back outer silhouettes are frozen. Later stages may add detail inside this structure, but may not move these proportions without reopening Stage 2 regression review.

See `base.json`, `freeze.json`, and `review/capture-manifest.json` for traceable measurements and review metadata.
