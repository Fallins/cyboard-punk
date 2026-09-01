# CYBOARD Operator Character Bible

This document is the visual source of truth for the production **NYX** and **AXON** operator assets.

The goal is not to create generic cyberpunk avatars. They must read as two members of the same CYBOARD command system: restrained, intelligent, technical, and usable as an always-visible desktop instrument.

## Shared visual language

Both operators share these non-negotiable traits:

- near-future command-system aesthetic rather than dystopian streetwear
- dark graphite / midnight navy base materials
- CYBOARD cyan `#20F6FF`, violet `#8B5CFF`, magenta `#FF2FCF`
- luminous diamond-shaped chest core derived from the CYBOARD mark
- clean layered armor / technical garment surfaces with thin emissive traces
- readable silhouette at roughly 220–320 px rendered height
- no handheld weapon, helmet, cape, backpack, giant shoulder armor, or busy props
- no brand marks other than abstract CYBOARD-compatible geometry
- calm neutral command posture
- expressive face, but not exaggerated anime proportions
- premium stylized-realistic 3D, not photoreal human skin and not toy/plastic
- holographic treatment is applied by CYBOARD at runtime; the source model itself should remain materially readable

## NYX

**Callsign:** NYX  
**Role:** Signal Intelligence Operator  
**Function:** observation, quota analysis, anomaly detection, provider intelligence

### Personality

NYX should feel composed, observant, precise, and fast without appearing aggressive. Her expression is neutral with a slight sense of alert focus. She is the character users should naturally associate with *reading the system*.

### Silhouette

- feminine adult humanoid proportions
- athletic but slender build
- narrow-to-medium shoulder line
- compact torso armor with a slightly tapered waist
- short asymmetric bob / layered synthetic hair silhouette
- clear face silhouette; hair must not cover both eyes
- small ear-side interface modules rather than headphones
- diamond core centered high on the sternum

### Color balance

- base: graphite / midnight navy
- cyan: visor/interface edges and selected seams
- magenta: hair energy accents / secondary circuit lines
- violet: core housing and mid-tone energy details
- skin should remain natural/stylized neutral and not become neon purple

### NYX image concept prompt

```text
Original adult female AI command operator named NYX, premium stylized-realistic 3D character design, near-future cyber command center aesthetic, calm intelligent expression, athletic slender build, short asymmetric dark violet-magenta bob haircut with subtle luminous strands, refined facial features, graphite and midnight-navy technical bodysuit with layered lightweight armor, thin cyan and magenta emissive circuit lines, small temple interface modules, glowing cyan visor element kept minimal and not covering the full face, luminous violet-magenta diamond-shaped energy core centered on the sternum, restrained high-tech design, clean silhouette, no weapon, no cape, no backpack, no logos, dark neutral studio background, cyan violet magenta rim lighting, full upper body visible, front three-quarter view, production character concept art, physically plausible materials, elegant and readable at small UI scale
```

### NYX negative prompt

```text
weapon, gun, sword, helmet, motorcycle gear, giant shoulder pads, bikini armor, exposed cleavage, fetish outfit, exaggerated anime eyes, childlike proportions, elf ears, fantasy magic, angel wings, demon horns, text, watermark, brand logo, Iron Man armor, existing movie character, photoreal celebrity, cluttered city background, excessive cables
```

## AXON

**Callsign:** AXON  
**Role:** Systems Operations Operator  
**Function:** execution, active-agent activity, infrastructure state, operational response

### Personality

AXON should feel steady, dependable, analytical, and slightly more mechanical than NYX. He represents *acting on the system* rather than observing it.

### Silhouette

- masculine adult humanoid proportions
- athletic medium build, not bodybuilder-heavy
- stronger shoulder and chest structure than NYX
- short geometric hair / cropped technical silhouette
- angular jaw but approachable expression
- segmented forearm and shoulder interface surfaces
- same diamond core geometry as NYX

### Color balance

- base: graphite / deep blue-black
- cyan: dominant system traces / shoulder and forearm lines
- violet: secondary structural lighting
- magenta: concentrated mostly around core / status accents

### AXON image concept prompt

```text
Original adult male AI systems operator named AXON, premium stylized-realistic 3D character design, near-future cyber command center aesthetic, calm dependable analytical expression, athletic medium build, short geometric dark hair, refined masculine facial features, graphite and deep blue-black technical suit with segmented lightweight armor, thin cyan and violet emissive circuit lines, restrained temple interface modules, subtle narrow cyan visor indicator without hiding the face, luminous magenta-violet diamond-shaped energy core centered on the sternum, slightly stronger shoulder structure than the female counterpart but not bulky, no weapon, no cape, no backpack, no logos, dark neutral studio background, cyan violet magenta rim lighting, full upper body visible, front three-quarter view, production character concept art, physically plausible materials, clean silhouette readable at small UI scale
```

### AXON negative prompt

```text
weapon, gun, sword, helmet, military tactical vest, giant mech armor, bodybuilder proportions, superhero cape, fantasy armor, anime child proportions, glowing eyes with no pupils, text, watermark, brand logo, Iron Man armor, existing movie character, photoreal celebrity, cluttered city background, excessive cables
```

## Poster asset direction

Each character needs a reduced-motion / WebGL-unavailable poster:

```text
public/operator/nyx/poster.webp
public/operator/axon/poster.webp
```

Poster requirements:

- transparent or near-black background
- portrait / upper-torso composition
- face and diamond core both visible
- source canvas recommended at 1200x1600 or larger before export
- exported WebP should target <= 450 KB where practical
- avoid baked UI text or HUD lines; CYBOARD overlays its own HUD
- same camera angle and framing for NYX and AXON

## 3D generation / modeling prompt

When using a text-to-3D system, start from the approved 2D concept instead of prompting from scratch whenever possible.

```text
Create a game-ready stylized-realistic humanoid character from the supplied CYBOARD operator reference. Preserve facial identity, silhouette, hair shape, graphite technical suit, luminous diamond chest core, and cyan/violet/magenta accent placement. Neutral A-pose or T-pose, symmetrical rig-friendly body topology, separate eyes, hair, body and emissive armor material groups, clean humanoid skeleton compatibility, no weapon or loose props. Optimize for desktop real-time WebGL display: under 80k visible triangles, maximum 2K texture sets, atlas where practical, PBR metallic/roughness workflow, clean UVs, no baked background, no camera, no lights. Export as GLB with mesh centered near world origin and positive Y up.
```

## Rig and animation contract

Preferred humanoid skeleton conventions:

- hips / pelvis root
- spine chain
- neck / head
- left/right clavicle, upper arm, lower arm, hand
- left/right upper leg, lower leg, foot
- optional finger bones are allowed but not required for v1
- eyes or head bone should permit subtle gaze motion

Required production animation clips:

| Clip | Target behavior |
| --- | --- |
| `idle` | subtle breath, blink, tiny posture shift |
| `observing` | gaze / head scan, brief HUD-attention gesture |
| `processing` | more focused posture, small hand/interface motion |
| `warning` | alert posture / restrained amber-red response |
| `success` | short acknowledgement, <= 1.8 s preferred |
| `offline` | lowered energy / minimal motion |

Animation rules:

- no locomotion
- feet / lower body should remain visually stable
- loops must not visibly pop
- avoid large arm sweeps that collide with provider HUD panels
- idle should be subtle enough for a menu-bar utility
- runtime cross-fade target is approximately 0.2 s

## Acceptance checklist

A character is production-ready only when:

- silhouette is recognizable at 250 px height
- face does not visually collapse under CYBOARD emissive treatment
- diamond core remains visible in all six runtime states
- GLB is within the performance budget or has an explicit exception
- poster visually matches the 3D asset
- clip names satisfy the runtime contract
- no copyrighted character likeness, logo, or third-party protected design is intentionally reproduced
- both NYX and AXON still look like members of one product family
