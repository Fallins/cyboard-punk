# NYX v1.0 — Locked Production Reference

Status: **LOCKED**  
Locked on: **2026-09-02**

This document defines the approved production identity for NYX. Future 3D modeling, retopology, rigging, animation, posters, and runtime renders must preserve this identity unless the design is explicitly versioned to NYX v2.

## Reference priority

When visual references disagree, use this priority order:

1. **A-pose orthographic sheet** — highest authority for body proportions, mesh silhouette, rigging proportions, front/side/back geometry, footwear height, and shoulder/arm placement.
2. **Turnaround/detail sheet** — highest authority for suit panel construction, back structure, glove design, boot construction, chest-core housing, and emissive seam placement.
3. **Face/upper-body close-up** — highest authority for facial identity, eye shape, haircut structure, skin treatment, collar materials, chest materials, and diamond-core finish.
4. **Full-body hero concept** — highest authority for overall presence, sensuality, posture, final material mood, and promotional rendering.

Do not average conflicting references. Use the authority above for the relevant feature.

## Non-negotiable character identity

NYX is an **adult female Signal Intelligence Operator** with a mature, attractive, distinctly feminine silhouette.

The following are intentional design features, not generation artifacts:

- short black-purple bob haircut
- refined semi-realistic adult face
- calm, intelligent, confident expression
- full and prominent bust
- narrow, clearly defined waist
- curvy hips and glute silhouette
- long elegant legs
- hourglass body proportions
- fitted black cyber-tech operator suit
- smoked translucent upper panels
- cyan / magenta / violet emissive seams
- small luminous diamond-shaped chest core
- high cyber collar
- slim fitted gloves
- sleek heeled operator boots

Retopology, rigging, cloth cleanup, or optimization must **not flatten the bust, widen the waist, narrow the hips, shorten the legs, or convert NYX to generic unisex proportions**.

## Anatomy and modeling guidance

- Preserve the A-pose reference as the body-proportion source of truth.
- Keep the chest volume natural and structurally supported by the suit paneling; do not collapse it into a flat torso shell.
- Maintain a readable waist indentation from front, side, and back views.
- Preserve hip width and posterior projection from the approved side/back references.
- Shoulder width should remain feminine and balanced against the hip width.
- Legs should remain long and elegant without extreme stylization.
- Hands must remain proportionate and deformation-friendly.
- Heeled footwear must be accounted for in the neutral rig stance so the legs do not change apparent length after animation.

## Suit construction

Primary materials:

- matte black advanced polymer
- graphite technical fabric / soft-touch composite
- smoked translucent technical panels
- brushed dark titanium / dark metal
- restrained satin/gloss accents only where structurally useful

The suit is intentionally body-conscious and sensual, but should read as premium engineered operator equipment rather than generic latex, fetishwear, or superhero armor.

Required visual anchors:

- chest paneling follows and supports NYX's full bust
- diamond core remains centered at the upper sternum
- high collar frames the head without obscuring the jaw
- thin cyan/magenta/violet seams describe the torso, waist, forearms, hips, thighs, and calves
- back construction includes a clear central spinal/interface structure
- boots remain sleek, fitted, heeled, and technologically functional

## Diamond core

The diamond-shaped chest core is NYX's strongest product identifier.

Requirements:

- small and premium, not a large superhero reactor
- centered high on the sternum
- visible in every runtime state
- emissive cyan/violet/magenta response is allowed
- housing must integrate physically into the surrounding suit construction
- do not let bloom or transparency erase its diamond silhouette

## Production mesh contract

Export target:

- glTF 2.0 binary `.glb`
- Y-up
- character centered near world origin
- feet aligned to the ground plane
- neutral A-pose source
- deformation-friendly humanoid topology
- production visible triangle target <= 80k
- <= 12 material slots target
- 20–120 unique rig joints
- clean skin weights with JOINTS_0 / WEIGHTS_0
- PBR textures <= 2K per set; atlas where practical
- self-contained GLB with embedded buffers/images
- no Draco, Meshopt, or KTX2 compression until CYBOARD explicitly enables those decoders
- target GLB size <= 8 MB where practical

Suggested material groups:

1. skin / face
2. eyes
3. hair
4. matte suit
5. smoked translucent suit panels
6. dark metal
7. emissive cyan
8. emissive magenta/violet
9. diamond core

Material count may be consolidated for runtime efficiency as long as the visual identity is preserved.

## Rig contract

Minimum humanoid structure:

- root / hips
- spine chain
- chest / upper chest
- neck / head
- left/right clavicle
- upper arm / lower arm / hand
- upper leg / lower leg / foot
- optional toe bones
- eye/head controls sufficient for subtle gaze motion
- finger bones recommended but not required for v1 if hand poses remain believable

No mandatory cloth, hair, or physics simulation is required for v1.

## Required animation clips

Exact canonical clip names:

- `idle`
- `observing`
- `processing`
- `warning`
- `success`
- `offline`

Behavior targets:

- `idle` — subtle breathing, blink, tiny head/weight shift
- `observing` — restrained gaze/head scan toward provider data
- `processing` — focused posture and small interface/forearm motion
- `warning` — alert posture with restrained response, not combat stance
- `success` — short acknowledgement/nod, preferably <= 1.8 s
- `offline` — low-energy near-static pose

Animation constraints:

- no locomotion
- no large arm sweeps
- feet remain visually stable
- loops must not pop
- avoid motion that collides with CYBOARD provider HUD panels
- runtime cross-fade target is ~0.2 s

## Poster contract

Expected path:

```text
public/operator/nyx/poster.webp
```

Poster requirements:

- use the locked NYX face and proportions
- face and diamond core both visible
- dark/transparent background suitable for CYBOARD
- no baked UI text or HUD
- same material identity as the production GLB
- target <= 450 KB where practical

## Acceptance gate

Run:

```bash
bun run operator:validate
```

Release gate:

```bash
bun run operator:validate:strict
```

NYX v1 is production-ready only when:

- the GLB passes the strict validator
- anatomy matches the locked A-pose reference
- face matches the approved close-up reference
- suit construction matches the approved turnaround/detail reference
- the full bust / narrow waist / curvy hips / long-leg silhouette remains intact
- all six animation clips exist and transition cleanly
- the poster matches the GLB
- the character remains readable at ~250 px UI height
- the diamond core remains visible under CYBOARD runtime emissive treatment
- real-device Tauri performance stays inside the Phase 2 budget

## Reference file naming

When the approved source images are committed or archived, use:

```text
nyx-v1-apose.png
nyx-v1-turnaround.png
nyx-v1-closeup.png
nyx-v1-hero.png
```

The binary source art may be stored outside the repository until explicitly added; the design authority and production rules in this document remain canonical either way.
