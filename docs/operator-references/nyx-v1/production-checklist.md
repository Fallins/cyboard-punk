# NYX v1.0 — 3D Production Checklist

This checklist turns the locked NYX v1.0 references into a production GLB for CYBOARD.

Use together with [`README.md`](./README.md).

## Stage 1 — Reference ingest

- [ ] A-pose sheet loaded into front/side/back orthographic views
- [ ] turnaround/detail sheet available for suit, glove, boot and rear construction
- [ ] close-up available for face, hair and material finish
- [ ] hero concept available for final presence / sensuality / material mood
- [ ] modeling scene set to Y-up export convention
- [ ] floor plane / feet baseline defined consistently

Acceptance:

- front, side and back references are aligned to the same character height
- no modeler-side reinterpretation of bust, waist, hip or leg proportions

## Stage 2 — Base mesh and anatomy

- [ ] adult female base mesh established in neutral A-pose
- [ ] full prominent bust matches A-pose side/front reference
- [ ] narrow defined waist preserved
- [ ] hip width and posterior projection match approved references
- [ ] shoulder width remains balanced and feminine
- [ ] long-leg proportion preserved
- [ ] hands and feet are clean enough for deformation
- [ ] face blockout matches the approved close-up rather than generic base-mesh identity

Acceptance:

- silhouette matches the locked A-pose at front, side and back
- no flattening / averaging toward generic unisex anatomy

## Stage 3 — Retopology

- [ ] shoulder loops support 30–40 degree A-pose deformation
- [ ] chest topology preserves volume without pinching across the sternum/core area
- [ ] elbow and wrist loops support restrained HUD gestures
- [ ] hip / glute / upper-leg topology deforms cleanly without destroying the hourglass silhouette
- [ ] knee and ankle topology supports heeled neutral stance
- [ ] face topology supports blink and subtle expressions
- [ ] hair is kept lightweight and readable at ~250 px render height

Acceptance:

- target production mesh remains <= 80k visible triangles
- silhouette remains visually indistinguishable from the approved anatomy at dashboard scale

## Stage 4 — Suit construction

- [ ] matte black polymer base panels
- [ ] graphite technical/flexible sections
- [ ] smoked translucent upper panels
- [ ] dark brushed-metal structural pieces
- [ ] high cyber collar
- [ ] slim gloves / forearm interface surfaces
- [ ] sleek heeled operator boots
- [ ] back spinal/interface construction
- [ ] diamond-core housing integrated high on the sternum
- [ ] cyan / magenta / violet emissive seams follow the approved turnaround

Acceptance:

- suit remains engineered and premium rather than full-body glossy latex
- chest paneling accommodates the locked full bust rather than flattening it
- diamond core remains clearly readable from front and 3/4 views

## Stage 5 — UV and PBR materials

- [ ] clean non-overlapping UVs where required
- [ ] texture sets <= 2K
- [ ] atlas materials where practical
- [ ] <= 12 material slots target
- [ ] skin / eye / hair response remains readable under emissive runtime treatment
- [ ] smoked panels use restrained transparency
- [ ] matte suit remains predominantly rough rather than mirror-glossy
- [ ] emissive channels are isolated from base color where practical

Suggested groups:

1. skin/face
2. eyes
3. hair
4. matte suit
5. smoked panels
6. dark metal
7. cyan emissive
8. magenta/violet emissive
9. diamond core

Acceptance:

- source model looks correct before CYBOARD adds holographic treatment
- face and diamond core do not wash out under emissive lighting

## Stage 6 — Rig and skin weights

- [ ] root / hips
- [ ] spine / chest / upper chest
- [ ] neck / head
- [ ] left/right clavicle
- [ ] upper arm / lower arm / hand
- [ ] upper leg / lower leg / foot
- [ ] optional toes
- [ ] eye/head controls for subtle gaze
- [ ] finger bones recommended if budget allows
- [ ] clean weights around shoulders, bust/chest, hips, glutes, elbows and knees

Acceptance:

- 20–120 unique joints
- all deforming mesh primitives expose JOINTS_0 / WEIGHTS_0
- neutral pose retains the locked silhouette
- common warning/processing gestures do not collapse chest or shoulder topology

## Stage 7 — Animation clips

Exact names required:

- [ ] `idle`
- [ ] `observing`
- [ ] `processing`
- [ ] `warning`
- [ ] `success`
- [ ] `offline`

Acceptance:

- no locomotion
- feet remain stable
- loops do not pop
- no large arm sweeps into provider HUD panels
- success acknowledgement preferably <= 1.8 s
- idle motion is subtle enough for a desktop utility
- blink / breath / gaze remain low-amplitude and non-distracting

## Stage 8 — GLB export

- [ ] glTF 2.0 binary `.glb`
- [ ] self-contained buffers and images
- [ ] Y-up
- [ ] centered near world origin
- [ ] feet at ground plane
- [ ] default scene declared
- [ ] no external image/buffer references
- [ ] no `KHR_draco_mesh_compression`
- [ ] no `EXT_meshopt_compression`
- [ ] no `KHR_texture_basisu`
- [ ] target <= 8 MB where practical

Expected path:

```text
public/operator/nyx/nyx.glb
```

Validation:

```bash
bun run operator:validate
bun run operator:validate:strict
```

## Stage 9 — Poster

- [ ] poster generated from the production NYX identity
- [ ] face and diamond core visible
- [ ] no baked CYBOARD HUD text
- [ ] dark/transparent background
- [ ] <= 450 KB target where practical

Expected path:

```text
public/operator/nyx/poster.webp
```

## Stage 10 — CYBOARD integration smoke test

- [ ] dashboard loads GLB instead of procedural asset
- [ ] `data-asset="glb"` observed on renderer host
- [ ] all six semantic states find their matching animation clips
- [ ] manual Refresh triggers observing -> success when healthy
- [ ] active agent triggers processing
- [ ] warning quota state triggers warning
- [ ] reduced-motion uses poster without creating continuous WebGL animation
- [ ] missing/broken asset still falls back safely
- [ ] character remains correctly framed at default 1180x760 window
- [ ] provider HUD panels do not overlap face/core/major gestures

## Stage 11 — Performance acceptance

- [ ] <= 80k visible triangles
- [ ] <= 12 material slots target
- [ ] textures <= 2K
- [ ] hidden window produces zero intentional animation frames
- [ ] ambient target <= 30 FPS
- [ ] adaptive quality can lower DPR / FPS without breaking framing
- [ ] no sustained GPU-heavy behavior for a menu-bar utility

## Definition of done

NYX v1.0 is complete only when the model, poster, six clips, strict validator, real-device rendering, and performance acceptance all pass. A visually correct static model without the runtime/animation/performance gates is not considered production-complete.
