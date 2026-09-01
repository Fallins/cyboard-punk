# CYBOARD production operator assets

The production character pipeline is defined by:

- [`../../src/ui/operator-manifest.json`](../../src/ui/operator-manifest.json) — canonical asset paths, names, colors, required animation clips and performance budgets
- [`../../docs/operator-characters.md`](../../docs/operator-characters.md) — canonical NYX / AXON character bible
- [`../../docs/operator-references/nyx-v1/README.md`](../../docs/operator-references/nyx-v1/README.md) — locked NYX v1.0 modeling reference hierarchy and production handoff
- `src/ui/operatorAssets.ts` — typed runtime view of the canonical manifest

The runtime automatically looks for these optional production assets:

```text
public/operator/
  nyx/
    nyx.glb
    poster.webp
  axon/
    axon.glb
    poster.webp
```

When an asset is missing, invalid, or cannot be loaded, CYBOARD keeps the built-in procedural holographic operator. Provider metrics and controls never depend on these files.

## Validate assets

During development, missing production files are reported but do not fail the command:

```bash
bun run operator:validate
```

Before tagging a release that claims production operators are complete, use strict validation:

```bash
bun run operator:validate:strict
```

Validation checks the GLB container, self-contained packaging, runtime-compatible glTF extensions, default scene, six canonical animation clip names, triangle budget, material count, skin/joint budget, and JOINTS_0 / WEIGHTS_0 skinning attributes. Poster existence and file size are also checked.

## GLB contract

- glTF 2.0 binary `.glb`, self-contained: no external buffers or external image files.
- Current runtime intentionally does **not** configure Draco, Meshopt, or KTX2 decoders. Do not export `KHR_draco_mesh_compression`, `EXT_meshopt_compression`, or `KHR_texture_basisu` until the runtime explicitly adds those decoders.
- NYX and AXON should share compatible humanoid skeleton conventions and screen-space framing.
- Target <= 80k visible triangles per operator.
- Target <= 12 material slots per operator.
- Humanoid rig target: 20–120 unique joints.
- Prefer <= 2K PBR textures and texture atlases.
- GLB target <= 8 MB where practical.
- Character origin should be centered and the model should have a valid non-zero bounding box; CYBOARD normalizes scale and framing at runtime.
- Materials are cloned by the runtime before CYBOARD applies its restrained holographic emissive treatment.
- Source materials should remain readable without relying on runtime bloom or transparency.

## Animation clips

Required production clip names, case-insensitive:

```text
idle
observing
processing
warning
success
offline
```

The runtime keeps compatibility fallbacks (`working` can stand in for `processing`) and falls back to `idle` when a state-specific clip is absent during development. Production strict validation still requires the canonical six names.

## Poster contract

Reduced-motion and WebGL-unavailable modes use:

```text
/operator/nyx/poster.webp
/operator/axon/poster.webp
```

Keep the face and diamond core visible, use matching framing for both characters, do not bake CYBOARD HUD text into the image, and target <= 450 KB per poster where practical.
