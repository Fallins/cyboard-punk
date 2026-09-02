# NYX 2.5D Asset Specification

Status: **PHASE 1 / SOURCE-OF-TRUTH SPEC**  
Created: **2026-09-02**  
Project: **CYBOARD**  
Operator: **NYX — AI Signal Intelligence Operator**

This document is the implementation source of truth for the custom Three.js 2.5D NYX renderer.

It does not replace the product-level six-state contract. It defines the art, layer, render, deformation, batching, masking, resolution, and validation contract required before runtime animation work begins.

---

## 1. Priority

When constraints conflict, use this order:

1. NYX face / body / silhouette fidelity
2. static composition fidelity to `NYX_MASTER`
3. lifecycle correctness and safe fallback
4. subtle believable motion
5. CPU / GPU / memory efficiency
6. encoded asset size

Do not reduce visual identity merely to hit a soft optimization target.

---

## 2. Locked NYX identity

NYX is an adult mature female AI Signal Intelligence Operator.

Non-negotiable:

- refined mature semi-realistic face
- calm / intelligent / controlled expression
- fair light skin with healthy soft pink-beige undertones
- full rich violet-purple bob hair from roots to ends
- prominent full bust
- narrow defined waist
- curvy hips
- shapely feminine thighs
- long elegant legs
- mature hourglass silhouette
- premium fitted matte-black / graphite cyber-tech operator suit
- smoked translucent upper panels
- restrained cyan / magenta / violet emissive seams
- small glowing diamond-shaped chest core
- high cyber collar
- fitted gloves
- futuristic heeled ankle boots

The current 2.5D work must not regress to black hair with isolated purple highlights.

---

## 3. Master artwork contract

Canonical source name:

```text
NYX_MASTER
```

Recommended source file:

```text
assets/operator/nyx/source/master.png
```

Source requirements:

```text
canvas: 2048 × 3072 minimum
color: sRGB
alpha: straight alpha preferred
background: transparent
bit depth: 8-bit minimum
pose: operator hero pose
```

A larger source is allowed. Build output must be deterministic regardless of source size.

### Hero pose

- nearly front-facing
- body yaw target: 5–10°
- face directed toward viewer
- head roll near 0°
- feet visually grounded
- shoulders relaxed
- arms close enough to torso for dashboard readability, but not fused into body silhouette
- no combat pose
- no large hip contrapposto
- expression calm and attentive

### Framing

- top head clearance: 4–7% of canvas height
- sole / ground clearance: 2–5%
- character occupies approximately 86–92% of canvas height
- centerline may shift horizontally up to 4% to preserve HUD space
- diamond core must remain unobstructed
- face must remain readable after downscale to actual CYBOARD display size

### Static acceptance

Before layer extraction:

> The standalone `NYX_MASTER` must already look production-quality.

If the static master is not visually superior to the aggressively reduced 3D runtime candidate, stop and fix the art before rigging.

---

## 4. Protected face region

The face is the highest-fidelity region.

`face_base` is:

```text
deformationPolicy: rigid
```

Forbidden in v1:

- cheek mesh warping
- nose mesh warping
- mouth translation
- jaw width deformation
- eye-distance deformation
- perspective fake-turn deformation across the face

Allowed:

- transform-only head motion
- iris / pupil micro-translation
- blink overlay / eyelid motion
- optional tiny eyebrow overlay motion if required by state design

Nose, mouth, cheeks, primary facial shading, and primary eyebrow shape should remain baked into `face_base` unless a later visual QA proves a split is lossless.

---

## 5. Source tree

Non-shipping source:

```text
assets/operator/nyx/
  source/
    master.png
    layers/
    masks/
  rig.json
```

Production output:

```text
public/operator/nyx-2d/
  manifest.json
  base.webp
  effects.webp
  poster.webp
```

Optional runtime variants:

```text
public/operator/nyx-2d/
  base@1x.webp
  base@2x.webp
  effects@1x.webp
  effects@2x.webp
```

Production atlases must be build outputs, not hand-maintained files.

---

## 6. Coordinate conventions

Canvas coordinates:

```text
x: 0..1 left → right
y: 0..1 top → bottom
```

Layer-local pivot:

```text
pivot.x: 0..1
pivot.y: 0..1
```

UV:

```text
u: 0..1
v: 0..1
```

Depth and ordering are not inferred from floating-point z alone.

Every layer must have a deterministic integer `renderOrder`.

---

## 7. Deformation policies

Allowed values:

```text
rigid
transform-only
mesh-deform
effect-only
```

Meaning:

- `rigid`: no vertex deformation; only inherited group transform
- `transform-only`: local translate / rotate / scale allowed, no vertex edits
- `mesh-deform`: subdivided plane may update persistent vertices
- `effect-only`: visual light / emissive / overlay layer, no anatomical ownership

---

## 8. Mask strategies

Allowed values:

```text
source-alpha
shader-alpha-mask
stencil
none
```

Priority:

1. `source-alpha`
2. `shader-alpha-mask`
3. `stencil` only when required

v1 should avoid nested stencil masks where possible.

---

## 9. Render groups

Canonical render groups:

```text
body
face
eyes
hair-back
hair-front
effects
```

Canonical batch groups:

```text
base-rigid
base-transform
base-deform
effect-additive
effect-alpha
```

Batching is allowed only when layers share compatible:

- texture atlas
- shader / material
- blend mode
- mask strategy
- update path

Texture atlas usage alone does not imply batching.

---

## 10. Prototype layer contract

The first prototype should use the minimum useful set.

| ID | Render order | Policy | Render group | Batch group | Mesh | Primary ownership |
| --- | ---: | --- | --- | --- | --- | --- |
| `hair_back` | 100 | mesh-deform | hair-back | base-deform | 6×8 | rear bob mass |
| `neck` | 200 | rigid | body | base-rigid | quad | neck / hidden reconstruction |
| `torso_base` | 300 | mesh-deform | body | base-deform | 6×8 | torso / waist / pelvis base |
| `shoulder_left` | 320 | transform-only | body | base-transform | quad | left shoulder |
| `shoulder_right` | 321 | transform-only | body | base-transform | quad | right shoulder |
| `upper_arm_left` | 340 | transform-only | body | base-transform | quad | left upper arm |
| `upper_arm_right` | 341 | transform-only | body | base-transform | quad | right upper arm |
| `forearm_left` | 360 | transform-only | body | base-transform | quad | left forearm / hand silhouette |
| `forearm_right` | 361 | transform-only | body | base-transform | quad | right forearm / hand silhouette |
| `chest_overlay` | 400 | transform-only | body | base-transform | quad | upper suit / chest surface |
| `collar` | 420 | transform-only | body | base-transform | quad | collar structure |
| `face_base` | 500 | rigid | face | base-rigid | quad | face / nose / mouth / cheeks |
| `eye_white_left` | 520 | rigid | eyes | base-rigid | quad | left sclera |
| `iris_left` | 521 | transform-only | eyes | base-transform | quad | left iris / pupil |
| `upper_lid_left` | 522 | transform-only | eyes | base-transform | quad | left blink |
| `eye_white_right` | 530 | rigid | eyes | base-rigid | quad | right sclera |
| `iris_right` | 531 | transform-only | eyes | base-transform | quad | right iris / pupil |
| `upper_lid_right` | 532 | transform-only | eyes | base-transform | quad | right blink |
| `hair_front_center` | 600 | mesh-deform | hair-front | base-deform | 4×8 | center fringe |
| `hair_front_left` | 610 | mesh-deform | hair-front | base-deform | 4×8 | left front hair |
| `hair_front_right` | 611 | mesh-deform | hair-front | base-deform | 4×8 | right front hair |
| `core` | 700 | rigid | body | base-rigid | quad | diamond core base |
| `core_glow` | 800 | effect-only | effects | effect-additive | quad | core bloom |
| `suit_emissive` | 810 | effect-only | effects | effect-additive | quad | cyan / magenta / violet seams |

Optional fidelity layers may be added only after the static prototype passes.

Potential later splits:

```text
hair_side_left_back
hair_side_right_back
hair_side_left_front
hair_side_right_front
eyebrow_left
eyebrow_right
suit_emissive_cyan
suit_emissive_magenta
suit_emissive_violet
```

Do not split lips / nose merely for theoretical future animation.

---

## 11. Pivot ownership

Exact numeric pivots are measured from final extracted source layers and stored in `rig.json`.

Semantic pivot requirements:

- `torso_base`: lower sternum / upper abdomen
- shoulders: shoulder joint visual center
- upper arms: shoulder joint
- forearms: elbow
- collar: lower neck center
- face group: base of neck
- iris: eye center
- eyelid: upper lid arc center
- hair back: crown / upper scalp
- front hair: root area near scalp
- core glow: diamond center

Hair vertices nearest the scalp should have the smallest motion weight.

---

## 12. Hidden-area reconstruction

Required before animation:

- full forehead behind fringe
- eyebrow / temple continuity behind front hair
- side cheek / ear continuity behind side hair
- neck behind collar
- torso behind arms where shoulder / arm transforms may expose gaps
- suit surface behind diamond core
- chest / collar boundaries behind effect overlays

No layer may reveal transparent holes during the maximum allowed v1 motion envelope.

---

## 13. Mesh subdivision

Default:

```text
rigid / transform-only: quad
```

Deforming prototype meshes:

```text
hair_back: 6×8
front hair pieces: 4×8
torso_base: 6×8
```

Maximum prototype vertices:

```text
< 2,000 total
```

Geometry is persistent. No per-frame geometry reconstruction.

---

## 14. Allowed motion envelope

### Head

```text
pitch: ±1.5°
yaw: ±2.0° normal, hard cap ±5° simulated
roll: ±0.8°
translation: only a few source pixels
```

The face itself remains rigid.

### Eyes

Runtime display equivalent:

```text
±1–3 px
```

Source-space movement is scaled from runtime display size, not hardcoded to source pixels.

### Breathing

- torso vertical shift: subtle
- torso local scale: tiny
- shoulders: very small delayed lift
- chest: local deformation only if visual QA remains stable
- waist width must not visibly pulse
- hips must remain stable

### Hair

Damped spring only. No full physics solver in v1.

---

## 15. Runtime state composition

External product contract remains:

```text
idle
observing
processing
warning
success
offline
```

Internal renderer contract:

```ts
type NyxBaseState = 'idle' | 'observing' | 'processing' | 'offline';
type NyxReaction = 'none' | 'warning' | 'success';
type NyxAttentionTarget = 'center' | 'codex' | 'claude' | 'cursor';

interface Nyx2DState {
  baseState: NyxBaseState;
  reaction: NyxReaction;
  attentionTarget: NyxAttentionTarget;
  intensity: number;
}
```

This allows warning / success reactions to overlay the current base behavior.

---

## 16. Motion ownership

| Motion | Owner |
| --- | --- |
| breathing | torso / shoulder procedural |
| blink | eyelid layers |
| gaze | iris layers |
| head sway | head transform group |
| hair follow-through | spring physics |
| core pulse | effect controller |
| seam energy | effect controller |
| warning | reaction controller |
| success | reaction controller |
| provider gaze | attention controller |

No single state timeline owns all channels.

---

## 17. State behavior

### Idle

- slow breathing
- random blink
- tiny gaze wandering
- subtle hair spring
- slow core pulse

### Observing

- small head bias
- lateral attention
- slightly brighter cyan response

### Processing

- slightly downward gaze
- tiny forward head bias
- slower breath
- faster restrained core pulse

### Warning reaction

Overlay on current base state:

- focused gaze
- small faster head response
- blink frequency reduced
- magenta emphasis
- sharper but still restrained motion

### Success reaction

Overlay:

- ~1° positive head acknowledgement
- core flare
- 1.5–2 s decay

### Offline

- head slightly lower
- almost static gaze
- minimal breathing
- emissive 15–25%

---

## 18. Texture atlas contract

Initial target:

```text
base.webp: 2048×2048
effects.webp: 1024×1024 or 2048×2048
```

This is a target, not a hard fidelity limit.

Resolution policy:

```text
actual CSS display height
×
devicePixelRatio cap
×
fidelity margin
```

If 2K visibly degrades face or suit detail on target Macs, build a higher-resolution variant.

Base atlas contains skin, face, eyes, hair, suit, and body. Effects atlas contains core bloom, emissive seams, and state-light overlays.

---

## 19. Runtime manifest minimum fields

Each layer must serialize:

```json
{
  "id": "face_base",
  "atlas": "base",
  "uv": [0, 0, 1, 1],
  "pivot": [0.5, 0.9],
  "anchor": "head",
  "renderOrder": 500,
  "mesh": {
    "columns": 1,
    "rows": 1
  },
  "maskStrategy": "source-alpha",
  "deformationPolicy": "rigid",
  "renderGroup": "face",
  "batchGroup": "base-rigid",
  "sourceAssetPath": "source/layers/face_base.png"
}
```

Actual emitted UV and pivot numbers are generated / measured from source assets.

---

## 20. Poster contract

Runtime poster:

```text
public/operator/nyx-2d/poster.webp
```

Must be rendered from the same neutral 2.5D source composition.

It must not use an older NYX face or a separate generated character.

Fallback order:

```text
2.5D WebGL
↓
2.5D poster
↓
procedural fallback
```

---

## 21. Lifecycle contract

The 2.5D renderer must stop when any of these are true:

- `document.hidden`
- owning Tauri window hidden
- owning Tauri window minimized
- renderer is not the active main / compact operator surface
- operator container is explicitly not visible

Pause means:

```text
RAF stop
physics stop
procedural animation stop
```

On resume:

- reset frame timestamp
- discard hidden elapsed time
- clamp any unexpected `dt`
- do not catch up physics

---

## 22. Reduced motion

When `prefers-reduced-motion: reduce`:

Keep:

- static composition
- core glow
- extremely weak emissive pulse

Disable:

- breathing
- gaze wandering
- hair spring
- parallax
- automatic head sway

---

## 23. Performance budget

### Hard requirements

- monitoring UI remains functional without operator
- WebGL failure falls back safely
- hidden rendering = 0 FPS
- hidden animation / physics stopped
- reduced motion honored
- idle allocations near zero
- face fidelity cannot be traded away for a soft size target

### Optimization targets

- active transition: 30 FPS
- idle can be evaluated at 20–24 FPS
- logical layers: about 20–40
- draw calls: ideally <= 12
- deforming meshes: <= 12
- vertices: < 2,000
- encoded assets: ~2–6 MB target
- GPU texture memory: ~16–40 MB target

Targets may be revised after real-device measurement.

---

## 24. Build pipeline

Required command:

```bash
bun run operator:build:2d
```

Expected pipeline:

```text
rig.json + source layers
↓
source validation
↓
trim / normalize
↓
atlas packing
↓
runtime manifest
↓
poster
↓
public/operator/nyx-2d/
```

Output must be deterministic. The build must not require manual atlas placement.

---

## 25. Validation

Required command:

```bash
bun run operator:validate:2d
```

Validate:

- source tree exists
- rig JSON parses
- every source layer exists
- required layer IDs exist
- unique render order
- valid UV / pivot ranges
- finite mesh dimensions
- valid deformation policy
- valid mask strategy
- valid render / batch group
- base / effects atlas exists after build
- poster exists after build
- runtime resolution metadata valid
- state mappings valid

Before assets land, the validator may report missing art as a clear non-strict warning; it must still validate the schema itself.

---

## 26. Visual regression

Once `NYX_MASTER` and static layer reconstruction are complete, create a deterministic neutral-pose capture.

Golden authority:

```text
NYX_MASTER
```

Visual regression catches:

- layer offset
- alpha seams
- wrong UV
- wrong render order
- face shift
- missing layer
- accidental composition degradation

Automated visual comparison does not replace manual art QA.

---

## 27. Static fidelity gate

Phase 3 cannot proceed to life motion unless:

- face remains visually identical in identity
- body silhouette remains intact
- waist / hips / bust proportions remain intact
- hair silhouette matches master
- core position matches master
- layer seams are not visible
- static composite is effectively indistinguishable from master at target UI size

Failure:

> Fix source layers / atlas / composition first. Do not compensate with animation.

---

## 28. Current implementation status

As of 2026-09-02:

- 3D source and current renderer remain available for A/B
- aggressive 3D production reduction is frozen
- custom Three.js 2.5D is the preferred prototype direction
- this Asset Specification is now the required source of truth before runtime animation implementation
- final `NYX_MASTER` art has not yet been committed to the repository
- legacy NYX poster / 3D renders are reference material only unless they match the final approved 2.5D master

Next execution step:

1. land source/build/validation scaffolding
2. create / approve final `NYX_MASTER`
3. extract the prototype layers
4. pass static fidelity gate
5. only then add life motion
