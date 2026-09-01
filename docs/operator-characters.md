# CYBOARD Operator Character Bible

This document is the canonical visual source of truth for the production **NYX** and **AXON** operator family.

The goal is not to create generic cyberpunk avatars. Both operators must read as members of the same CYBOARD command system: premium, intelligent, technical, original, and readable as an always-visible desktop instrument.

For the locked NYX v1 production handoff, see [`operator-references/nyx-v1/README.md`](./operator-references/nyx-v1/README.md).

## Shared visual language

Both operators share these non-negotiable traits:

- adult human characters
- near-future command-system aesthetic rather than dystopian streetwear
- graphite / midnight-black technical materials
- CYBOARD cyan `#20F6FF`, violet `#8B5CFF`, magenta `#FF2FCF`
- luminous diamond-shaped chest core derived from CYBOARD geometry
- clean technical paneling with restrained emissive traces
- readable silhouette at roughly 220–320 px rendered height
- no handheld weapons, helmets, capes, backpacks, giant shoulder armor, or busy props
- no third-party logos or copied franchise design language
- calm command posture rather than combat posing
- expressive but controlled faces
- premium semi-realistic / stylized-realistic 3D rather than toy/plastic or photoreal celebrity likeness
- runtime holographic treatment is applied by CYBOARD; source materials must remain readable before effects

## NYX — Signal Intelligence Operator

**Status:** NYX v1.0 design locked on 2026-09-02.  
**Role:** observation, quota analysis, anomaly detection, provider intelligence.

### Character identity

NYX is an adult woman with a mature, attractive, highly feminine silhouette. Her sensuality is intentional product identity and must not be erased during 3D production.

Non-negotiable identity:

- short black-purple bob haircut
- refined semi-realistic adult face
- calm, intelligent, confident expression
- full and prominent bust
- narrow defined waist
- curvy hips and glute silhouette
- long elegant legs
- hourglass proportions
- fitted premium black cyber-tech operator suit
- smoked translucent upper panels
- cyan / magenta / violet emissive seams
- small diamond energy core high on the sternum
- high cyber collar
- slim fitted gloves
- sleek heeled operator boots

NYX should be sexy, mature, sophisticated, and authoritative without becoming pornographic, fetish-costumed, or impractical. The sensuality comes from anatomy, tailored fit, proportion, material contrast, and confident presentation.

### Suit materials

Primary materials:

- matte black advanced polymer
- graphite technical fabric / soft-touch composite
- smoked translucent technical panels
- brushed dark titanium / dark metal
- restrained satin/gloss highlights

Avoid turning the whole suit into shiny latex. Avoid bikini armor, excessive cleavage, superhero plating, military bulk, or random greebles.

### NYX master concept prompt

```text
Use the approved NYX references as the strict identity source. Create NYX, an adult female AI Signal Intelligence Operator for CYBOARD. Mature refined semi-realistic face, short black-purple bob hair, calm intelligent confident expression, full prominent bust, narrow defined waist, curvy hips, long elegant legs, attractive hourglass proportions. Preserve her voluptuous feminine anatomy intentionally. Highly fitted premium cyber-tech operator suit using matte black polymer, graphite technical fabric, smoked translucent upper panels and brushed dark metal. Thin cyan, magenta and violet emissive seams frame the chest, waist, forearms, hips, thighs and calves. A small luminous diamond-shaped energy core is integrated high on the sternum. High cyber collar, slim fitted gloves, sleek functional heeled operator boots. Sophisticated, sensual, intelligent, premium, modelable. Sexy is intentional, but no pornographic styling, no bikini armor, no fetish latex, no heavy military armor, no superhero costume, no weapons, no street-punk clutter. Dark neutral studio background, premium AAA semi-realistic character concept quality.
```

### NYX negative prompt

```text
child, teenager, childlike proportions, flat chest, small bust, masculine torso, boxy waist, narrow hips, generic unisex body, bodybuilder, chibi, exaggerated cartoon anatomy, bikini armor, fetish latex, pornographic pose, excessive nudity, giant cleavage cutout, superhero armor, military tactical gear, giant shoulder pads, weapon, gun, sword, street punk, spikes, chains, graffiti, excessive cables, random mechanical greebles, text, watermark, logo, copied movie/game character, celebrity likeness
```

### NYX production authority

When approved images disagree:

1. A-pose front/side/back sheet controls anatomy, body proportions, mesh silhouette and rig proportions.
2. Turnaround/detail sheet controls suit construction, rear structure, gloves, boots and core housing.
3. Close-up controls face, hair, skin and material finish.
4. Hero concept controls final presence, sensuality and promotional rendering.

Do not average conflicting references. See the locked production handoff for exact requirements.

## AXON — Systems Operations Operator

**Role:** execution, active-agent activity, infrastructure state, operational response.

AXON should feel steady, dependable, analytical, and slightly more structural than NYX. He represents acting on the system rather than observing it.

### Character direction

- adult male humanoid proportions
- athletic medium build, not bodybuilder-heavy
- stronger shoulder/chest structure than NYX
- short geometric dark hair / cropped technical silhouette
- angular but approachable facial structure
- segmented forearm and shoulder interface surfaces
- same diamond core geometry as NYX
- same premium graphite / dark-metal material family

### AXON color balance

- base: graphite / deep blue-black
- cyan: dominant system traces / shoulder and forearm lines
- violet: secondary structural lighting
- magenta: concentrated around core / status accents

### AXON concept prompt

```text
Original adult male AI systems operator named AXON, premium stylized-realistic 3D character design, near-future cyber command-center aesthetic, calm dependable analytical expression, athletic medium build, short geometric dark hair, refined masculine facial features, graphite and deep blue-black technical suit with segmented lightweight armor, thin cyan and violet emissive circuit lines, restrained temple interface modules, luminous magenta-violet diamond-shaped energy core centered on the sternum, slightly stronger shoulder structure than NYX but not bulky, no weapon, no cape, no backpack, no logos, dark neutral studio background, cyan violet magenta rim lighting, production character concept art, physically plausible materials, clean silhouette readable at small UI scale
```

## Shared poster contract

Expected paths:

```text
public/operator/nyx/poster.webp
public/operator/axon/poster.webp
```

Requirements:

- face and diamond core visible
- transparent or near-black background
- matching screen-space framing between operators
- source canvas recommended at 1200x1600 or larger before export
- WebP target <= 450 KB where practical
- no baked CYBOARD UI text or HUD

## Shared 3D production contract

The canonical asset metadata and budgets live in [`../src/ui/operator-manifest.json`](../src/ui/operator-manifest.json).

Production models must use:

- neutral A-pose source
- clean deformation-friendly humanoid topology
- compatible skeleton conventions between NYX and AXON
- separate readable PBR material groups
- no mandatory cloth/hair simulation
- <= 80k visible triangles target
- <= 12 material slots target
- 20–120 unique joints
- <= 2K texture sets; atlas where practical
- target <= 8 MB GLB where practical
- glTF 2.0 binary, self-contained buffers/images
- no Draco, Meshopt, or KTX2 compression until CYBOARD runtime configures those decoders
- Y-up and centered near world origin

Run `bun run operator:validate` during development and `bun run operator:validate:strict` before a release claiming production operators are complete.

## Shared animation contract

Required clip names:

| Clip | Target behavior |
| --- | --- |
| `idle` | subtle breath, blink, tiny posture shift |
| `observing` | gaze / head scan, brief HUD-attention gesture |
| `processing` | focused posture, small hand/interface motion |
| `warning` | alert posture / restrained response |
| `success` | short acknowledgement, <= 1.8 s preferred |
| `offline` | lowered energy / minimal motion |

Animation rules:

- no locomotion
- feet/lower body stay visually stable
- loops do not visibly pop
- avoid large arm sweeps that collide with provider HUD panels
- idle must remain subtle enough for a menu-bar utility
- runtime cross-fade target is approximately 0.2 s

## Production acceptance

A character is production-ready only when:

- silhouette remains recognizable at ~250 px height
- face survives CYBOARD emissive treatment
- diamond core remains readable in all runtime states
- anatomy matches the locked character identity
- strict asset validation passes
- poster visually matches the 3D asset
- all six clips transition cleanly
- no copyrighted character likeness or protected third-party design is intentionally reproduced
- NYX and AXON still look like members of one product family
