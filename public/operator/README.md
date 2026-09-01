# CYBOARD production operator assets

The runtime automatically looks for these optional production assets:

```text
public/operator/
  nyx/nyx.glb
  axon/axon.glb
```

When an asset is missing, invalid, or cannot be loaded, CYBOARD keeps the built-in procedural holographic operator. Provider metrics and controls never depend on these files.

## GLB contract

- NYX and AXON should share compatible humanoid skeleton naming and screen-space framing.
- Target <= 80k visible triangles per operator.
- Prefer <= 2K PBR textures and texture atlases.
- Compressed GLB target <= 8 MB where practical.
- Character origin should be centered and the model should have a valid non-zero bounding box; CYBOARD normalizes scale and framing at runtime.
- Materials are cloned by the runtime before CYBOARD applies its restrained holographic emissive treatment.

## Animation clips

Preferred clip names, case-insensitive:

```text
idle
observing
processing
warning
success
offline
```

The runtime has compatibility fallbacks (`working` can stand in for `processing`) and falls back to `idle` when a state-specific clip is absent.
