# CYBOARD Operator Character Specification

## Role
The Operator is CYBOARD's original holographic system avatar. It is not Codex, Claude, Cursor, Antigravity, or any vendor mascot; it supervises every provider and communicates system state.

Users can choose one of three modes:

- `female` — **NYX**, the default CYBOARD systems operator
- `male` — **AXON**, the alternate CYBOARD systems operator
- `off` — no character renderer; the abstract CY core remains as the lightweight fallback

NYX and AXON share the same visual language, animation contract, skeleton expectations, emissive materials, and UI footprint so switching characters never changes dashboard layout.

## Shared visual language
- adult human character, visually mid-20s to early-30s
- original facial design; calm, precise, observant expression
- graphite / deep navy technical suit with modular shoulder and neck interfaces
- restrained cyan, violet, and magenta emissive circuit seams
- transparent holographic temple / ear interface
- clean premium sci-fi aesthetic rather than dirty dystopian cyberpunk
- no weapons, military insignia, superhero silhouettes, arc-reactor motifs, or copied franchise details
- silhouette readable at bust / half-body scale
- designed for a deep navy command-center UI and translucent hologram treatment

## NYX — female operator
### Character direction
- adult woman, visually late 20s
- refined natural facial proportions, confident but not aggressive
- short layered magenta-to-violet hair with cyan rim light
- slim athletic silhouette; technical suit follows anatomy without sexualized armor styling
- slightly softer facial planes than AXON while retaining the same industrial design language

### Master image-generation prompt
Create an original premium cyberpunk AI systems operator for a desktop software product named CYBOARD. Adult female character, visually late 20s, intelligent calm expression, refined symmetrical but natural facial features, short layered magenta-violet hair with subtle cyan rim light, dark navy and graphite futuristic technical bodysuit, restrained cyan and hot-magenta emissive circuit seams, subtle transparent holographic temple interface, no weapons, no logos from existing franchises, no resemblance to a real person or copyrighted character. Clean high-end sci-fi command-center aesthetic, holographic lighting, deep navy-black background, cyan/magenta/violet bokeh and HUD reflections, cinematic but suitable for UI integration, front three-quarter portrait, clear silhouette, realistic stylized 3D character concept art, physically plausible materials, soft skin shading, detailed eyes, premium game cinematic quality, original design.

## AXON — male operator
### Character direction
- adult man, visually early 30s
- calm analytical expression, lean athletic build rather than exaggerated superhero proportions
- short textured dark graphite hair with violet undertone and cyan edge light
- slightly broader shoulders and stronger jaw planes than NYX
- same graphite/navy suit architecture and emissive circuit language as NYX

### Master image-generation prompt
Create an original premium cyberpunk AI systems operator for a desktop software product named CYBOARD. Adult male character, visually early 30s, calm analytical expression, refined natural masculine facial structure, lean athletic proportions, short textured graphite-black hair with subtle violet undertone and cyan rim light, dark navy and graphite futuristic technical bodysuit, restrained cyan and hot-magenta emissive circuit seams, subtle transparent holographic temple interface, no weapons, no logos from existing franchises, no resemblance to a real person or copyrighted character. Clean high-end sci-fi command-center aesthetic, holographic lighting, deep navy-black background, cyan/magenta/violet bokeh and HUD reflections, cinematic but suitable for UI integration, front three-quarter portrait, clear silhouette, realistic stylized 3D character concept art, physically plausible materials, detailed eyes and skin, premium game cinematic quality, original design. Avoid bulky superhero armor, military styling, facial scars used as a cliché, or exaggerated bodybuilder anatomy.

## Production 3D model brief
Create production-ready original humanoid holographic AI operators based on the CYBOARD NYX and AXON specifications. Both characters must use compatible humanoid skeleton naming and identical animation clip names so the application can switch GLB/VRM assets without renderer logic changes.

Requirements:
- neutral A-pose source
- clean deformation-friendly topology
- facial blendshapes for blink, subtle smile, focused/warning expression, and speech-ready visemes
- humanoid skeleton compatible with GLB / VRM workflows
- separate hair, skin, suit, and emissive material groups
- no mandatory cloth or hair simulation
- target <= 80k visible triangles per character
- PBR textures <= 2K; prefer texture atlases
- compressed production GLB target <= 8 MB per operator where practical
- optimized for real-time WebGL/WebGPU-class rendering on Apple Silicon
- matching camera framing and character origin for both NYX and AXON

## Animation contract
Every production asset must expose the same state clips:

- `idle`: slow breathing, occasional blink, minimal head drift
- `observing`: eyes track an active provider panel, small head turn
- `processing`: faster HUD eye movement and subtle hand/forearm hologram gesture
- `warning`: focused expression, restrained amber/magenta emphasis
- `success`: subtle nod or relaxed expression with cyan pulse
- `offline`: desaturated hologram, reduced emissive intensity, near-static pose

The current Phase 2 procedural hologram maps application state to `idle`, `working`, and `offline`; the GLB renderer will expand `working` into the richer animation contract above.

## Runtime integration constraints
- operator mode is persisted as `female | male | off`
- renderer is lazy-loaded only when the operator is enabled
- dashboard metrics and controls must never depend on a character asset loading successfully
- hidden windows pause animation work
- reduced-motion mode pauses non-essential animation
- a static / procedural fallback is mandatory for WebGL failure or missing GLB assets
- female and male assets must occupy the same approximate screen-space bounds to prevent layout shift

## Asset naming
Planned production paths:

```text
public/operator/
  nyx/
    nyx.glb
    poster.webp
  axon/
    axon.glb
    poster.webp
```

Animation names inside both GLBs must match the shared animation contract exactly.
