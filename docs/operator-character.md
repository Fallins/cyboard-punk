# CYBOARD Operator Character Specification

## Role
The Operator is CYBOARD's original holographic system avatar. She is not Codex, Claude, or Cursor; she supervises all providers and communicates system state.

## Design
- adult woman, mid-20s to early-30s visual age
- original facial design; calm, precise, observant expression
- short layered magenta-to-violet hair with subtle cyan edge light
- charcoal/navy technical bodysuit with modular shoulder/neck interfaces
- cyan and magenta emissive circuit seams, used sparingly
- small transparent holographic earpiece/temple interface; no copied superhero armor
- clean premium sci-fi aesthetic, not dystopian grime
- silhouette readable at bust/half-body scale

## Master image-generation prompt
Create an original premium cyberpunk AI systems operator for a desktop software product named CYBOARD. Adult female character, visually late 20s, intelligent calm expression, refined symmetrical but natural facial features, short layered magenta-violet hair with subtle cyan rim light, dark navy and graphite futuristic technical bodysuit, restrained cyan and hot-magenta emissive circuit seams, subtle transparent holographic temple interface, no weapons, no logos from existing franchises, no resemblance to a real person or copyrighted character. Clean high-end sci-fi command-center aesthetic, holographic lighting, deep navy-black background, cyan/magenta/violet bokeh and HUD reflections, cinematic but suitable for UI integration, front three-quarter portrait, clear silhouette, realistic stylized 3D character concept art, physically plausible materials, soft skin shading, detailed eyes, premium game cinematic quality, original design.

## 3D model prompt / brief
Create a production-ready original humanoid holographic AI operator based on the CYBOARD character specification. Neutral A-pose, clean topology, facial blendshapes for blink/smile/frown/speech-ready visemes, humanoid skeleton compatible with VRM/GLB workflows, separate hair and emissive material groups, no loose cloth simulation required, <=80k visible triangles, PBR textures <=2K, optimized for real-time WebGL on Apple Silicon. Provide idle, observing, processing, warning, success and offline animation clips. Avoid copyrighted costume silhouettes, arc-reactor motifs, superhero armor, branded symbols, or likenesses.

## Animation states
- `idle`: slow breathing, occasional blink, minimal head drift
- `observing`: eyes track active provider panel, small head turn
- `processing`: faster HUD eye movement and hand/forearm hologram gesture
- `warning`: focused expression, amber/magenta panel highlight
- `success`: subtle relieved smile/nod, cyan pulse
- `offline`: desaturated hologram, reduced emissive intensity, near-static pose

## Integration constraints
The model is optional and lazy-loaded. No UI control or metric may depend on the 3D model. A static portrait and abstract holographic core are mandatory fallbacks.
