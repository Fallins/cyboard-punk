# CYBOARD production operator assets

The production character pipeline is defined by:

- [`manifest.json`](./manifest.json) — canonical asset paths, names, colors and performance budgets
- [`../../docs/operator-characters.md`](../../docs/operator-characters.md) — NYX / AXON character bible and generation prompts
- `src/ui/operatorAssets.ts` — runtime registry mirrored from the production manifest

The runtime automatically looks for these optional production assets:

```text
public/operator/
  manifest.json
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

Strict validation checks that both GLBs and posters exist, validates the GLB container, checks the six required animation clip names, estimates triangle count, and enforces the production triangle budget. Size targets are reported as warnings where appropriate.

## GLB contract

- NYX and AXON should share compatible humanoid skeleton naming and screen-space framing.
- Target <= 80k visible triangles per operator.
- Prefer <= 2K PBR textures and texture atlases.
- Compressed GLB target <= 8 MB where practical.
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
