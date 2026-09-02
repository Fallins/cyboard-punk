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

Canonical source file:

```text
assets/operator/nyx/source/master.webp
```

Source requirements:

```text
canvas: 941 × 1672 (approved native source)
color: sRGB
alpha: required
background: transparent
encoding: lossless WebP source master
pose: approved operator hero pose
```

The approved v1 source resolution is not a quality failure by itself. Runtime resolution is evaluated against actual CYBOARD CSS display size and capped device pixel ratio. A higher-resolution source is only required if Retina A/B testing shows visible degradation. Build output must remain deterministic.

### Approved source series

The v1 visual source of truth is locked in:

```text
assets/operator/nyx/source-lock.json
```

Policy:

> `series-locked-no-redesign`

The six approved user-supplied references define identity, proportions, suit details, face fidelity and transparent silhouette. Do not generate or reinterpret a replacement NYX while building the 2.5D pipeline.

Canonical master SHA-256:

```text
6ef57008ba843a57b614d148f4055c9fdf9235f303117098ac3e13387041f263
```

The transparent master was reconstructed non-generatively by keeping the approved high-resolution hero RGB and transferring alpha from the matching approved transparent cutout. The two images match at 285/286 RANSAC feature inliers with an approximately 2.001× scale transform.

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

### Static acceptance

Before layer extraction:

> The standalone `NYX_MASTER` must already look production-quality.

If a derived layer pipeline makes the static result visibly worse than the master, stop and fix the layer pipeline before animation.

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

Nose, mouth, cheeks, primary facial shading, and primary eyebrow shape should remain baked into `face_base` unless later visual QA proves a split is lossless.

---

## 5. Source tree

Non-shipping source:

```text
assets/operator/nyx/
  source-lock.json
  source/
    master.webp
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

Production atlases are build outputs, not hand-maintained files.

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

Depth and ordering are not inferred from floating-point z alone. Every layer must have deterministic integer `renderOrder`.

---

## 7. Deformation policies

Allowed values:

```text
rigid
transform-only
mesh-deform
effect-only
```

- `rigid`: no vertex deformation; only inherited group transform
- `transform-only`: local translate / rotate / scale allowed, no vertex edits
- `mesh-deform`: subdivided plane may update persistent vertices
- `effect-only`: light / emissive / overlay layer with no anatomical ownership

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

## 9. Render groups / batching

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

Batching is allowed only when layers share compatible texture atlas, material/shader, blend mode, mask strategy and update path.

> Texture atlas usage alone does not imply batching or one draw call.

---

## 10. Prototype layer contract

The first layered prototype uses the minimum useful set. Do not add layers just to hit a target count.

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

Optional later splits:

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

Do not split lips or nose merely for theoretical future animation.

---

## 11. Pivot ownership

Exact numeric pivots are measured from final extracted source layers and stored in `rig.json`.

Semantic pivots:

- `torso_base`: lower sternum / upper abdomen
- shoulders: shoulder-joint visual center
- upper arms: shoulder joint
- forearms: elbow
- collar: lower neck center
- face group: base of neck
- iris: eye center
- eyelid: upper-lid arc center
- hair back: crown / upper scalp
- front hair: root area near scalp
- core glow: diamond center

Hair vertices nearest the scalp have the smallest motion weight.

---

## 12. Hidden-area reconstruction

Required before anatomical motion:

- full forehead behind fringe
- eyebrow / temple continuity behind front hair
- side cheek / ear continuity behind side hair
- neck behind collar
- torso behind arms where transforms may expose gaps
- suit surface behind diamond core
- chest / collar boundaries behind effect overlays

No layer may reveal transparent holes during the maximum v1 motion envelope.

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

Maximum prototype vertices: `< 2,000 total`.

Geometry is persistent. No per-frame geometry reconstruction.

---

## 14. Allowed motion envelope

### Head

```text
pitch: ±1.5°
yaw: ±2.0° normal, hard cap ±5° simulated
roll: ±0.8°
translation: only a few runtime pixels
```

The face itself remains rigid.

### Eyes

Runtime display equivalent: `±1–3 px`.

### Breathing

- torso vertical shift: subtle
- torso local scale: tiny
- shoulders: very small delayed lift
- chest local deformation only if visual QA remains stable
- waist width must not visibly pulse
- hips remain stable

### Hair

Damped spring only. No full physics solver in v1.

---

## 15. Runtime state composition

External contract remains:

```text
idle
observing
processing
warning
success
offline
```

Internal renderer model:

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

Warning / success reactions can overlay the current base behavior instead of replacing it.

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

No single state timeline owns every channel.

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
- overlays current base state
- focused gaze
- small faster head response
- blink frequency reduced
- magenta emphasis

### Success reaction
- ~1° positive head acknowledgement
- core flare
- 1.5–2 s decay

### Offline
- head slightly lower
- almost static gaze
- minimal breathing
- emissive 15–25%

---

## 18. Texture / resolution contract

The first master-stage runtime uses the approved master directly for the poster. Layered atlases are introduced only after static layer fidelity passes.

Atlas targets after layer extraction:

```text
base.webp: up to 2048×2048 initially
effects.webp: 1024×1024 or 2048×2048
```

These are optimization targets, not fidelity limits.

Runtime resolution policy:

```text
actual CSS display height
×
devicePixelRatio cap
×
fidelity margin
```

If actual Retina A/B testing shows the 941×1672 source is insufficient, create a deliberate higher-resolution source variant without redesigning NYX.

---

## 19. Runtime manifest minimum fields

Each final layer serializes at least:

```json
{
  "id": "face_base",
  "atlas": "base",
  "uv": [0, 0, 1, 1],
  "pivot": [0.5, 0.9],
  "anchor": "head",
  "renderOrder": 500,
  "mesh": { "columns": 1, "rows": 1 },
  "maskStrategy": "source-alpha",
  "deformationPolicy": "rigid",
  "renderGroup": "face",
  "batchGroup": "base-rigid",
  "sourceAssetPath": "source/layers/face_base.png"
}
```

Actual UV and pivot values are measured/generated from approved source assets.

---

## 20. Poster / staged build contract

Runtime poster:

```text
public/operator/nyx-2d/poster.webp
```

It is always derived from the canonical `NYX_MASTER`, never an older face or independently generated character.

`operator:build:2d` supports a **master stage** before anatomical layers are finished:

```text
approved master
↓
poster.webp
+
manifest.json (stage=master)
```

When all declared layer sources exist, the build advances to layered/atlas stages.

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

The 2.5D renderer stops when any of these are true:

- `document.hidden`
- owning Tauri window hidden
- owning Tauri window minimized
- renderer is not the active main / compact operator surface
- operator container explicitly invisible

Pause means RAF, physics and procedural animation all stop. Resume resets frame timestamp, discards hidden elapsed time, clamps unexpected `dt`, and never catches up hidden physics.

---

## 22. Reduced motion

With `prefers-reduced-motion: reduce`, keep static composition plus extremely weak core/emissive lighting only. Disable breathing, gaze wandering, hair spring, parallax and automatic head sway.

---

## 23. Performance budget

### Hard requirements

- monitoring UI works without operator
- WebGL failure falls back safely
- hidden rendering = 0 FPS
- hidden animation / physics stopped
- reduced motion honored
- idle allocations near zero
- face fidelity cannot be traded away for a soft size target

### Optimization targets

- transitions: 30 FPS
- idle may be evaluated at 20–24 FPS
- logical layers: roughly 20–40, not a quota
- draw calls: ideally <= 12
- deforming meshes: <= 12
- vertices: < 2,000
- encoded runtime assets: ~2–6 MB target
- GPU texture memory: ~16–40 MB target

Priority remains static fidelity → motion fidelity → lifecycle correctness → CPU/GPU → memory → download size.

---

## 24. Build pipeline

Required command:

```bash
bun run operator:build:2d
```

Master stage:

```text
rig.json + source-lock.json + master.webp
↓
master validation
↓
poster.webp
↓
manifest.json
```

Layer stage after extraction:

```text
source layers
↓
source validation
↓
trim / normalize
↓
atlas packing
↓
runtime manifest
↓
public/operator/nyx-2d/
```

No manual production-atlas maintenance.

---

## 25. Validation

Required command:

```bash
bun run operator:validate:2d
```

It validates:

- rig/source-lock existence
- canonical master existence
- master SHA-256
- master dimensions and alpha
- state contracts
- layer IDs and unique render order
- deformation/mask/render/batch contracts
- vertex budget
- protected rigid `face_base`
- master-stage poster/manifest
- layered outputs once all layer sources exist

Non-strict mode warns for unfinished layer extraction. Strict mode makes missing pivots/layers/runtime outputs blocking.

---

## 26. Visual regression

After static layer reconstruction, create a deterministic neutral capture against canonical `NYX_MASTER`.

Visual regression catches layer offsets, alpha seams, wrong UV/order, face shift, missing layers and accidental composition degradation. Automated comparison does not replace manual art QA.

---

## 27. Static fidelity gate

Life motion cannot begin unless:

- face identity remains unchanged
- body silhouette remains intact
- bust / waist / hip proportions remain intact
- hair silhouette matches master
- core position matches master
- no visible layer seams
- static layered composite is effectively indistinguishable from master at target UI size

Failure means fix source layers/composition first. Do not compensate with animation.

---

## 28. Current implementation status

As of 2026-09-02:

- 3D source and current renderer remain available for A/B
- aggressive 3D runtime reduction is frozen
- approved six-image NYX source series is locked in `assets/operator/nyx/source-lock.json`
- canonical transparent `NYX_MASTER` is committed at `assets/operator/nyx/source/master.webp`
- canonical master is 941×1672 lossless WebP and is SHA-256 pinned in `rig.json`
- master reconstruction was non-generative: approved hero RGB + matching approved transparent alpha
- validator now checks the approved native master instead of enforcing an artificial 2048×3072 minimum
- build pipeline supports a master-stage poster/manifest before anatomy extraction
- custom Three.js 2.5D remains the preferred prototype direction

Next execution step:

1. produce master-stage runtime output and 2D/3D A/B switch
2. extract/reconstruct the minimum prototype layers
3. render the static layered candidate
4. pass the static fidelity gate
5. only then add life motion
