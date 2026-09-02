# CYBOARD production operator assets

The production character pipeline is defined by:

- [`../../src/ui/operator-manifest.json`](../../src/ui/operator-manifest.json) — canonical asset paths, names, colors, required animation clips and performance budgets
- [`../../docs/operator-characters.md`](../../docs/operator-characters.md) — canonical NYX / AXON character bible
- [`../../docs/operator-references/nyx-v1/README.md`](../../docs/operator-references/nyx-v1/README.md) — locked NYX v1.0 modeling reference hierarchy and production handoff
- [`../../docs/operator-references/nyx-v1/production-checklist.md`](../../docs/operator-references/nyx-v1/production-checklist.md) — stage-by-stage NYX 3D acceptance checklist
- [`../../docs/operator-references/nyx-v1/glb-inspection-2026-09-02.md`](../../docs/operator-references/nyx-v1/glb-inspection-2026-09-02.md) — binary inspection and production-source decision
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

## Intake a candidate model

Do not manually overwrite a working production model while evaluating a new candidate. Use the transactional intake command:

```bash
bun run operator:intake -- nyx /path/to/candidate.glb
```

With a poster candidate:

```bash
bun run operator:intake -- nyx /path/to/candidate.glb /path/to/poster.webp
```

The command backs up the current asset, stages the candidate, runs the validator, and automatically restores the previous model when validation fails.

## Inspect and build NYX

Generate a full JSON inspection directly from GLB accessors and embedded images:

```bash
bun run operator:inspect -- /path/to/character.glb /path/to/animations.glb --output inspection.json
```

Build the optimized NYX candidate from the selected Meshy character source:

```bash
bun run operator:build:nyx -- /path/to/character.glb --poster /path/to/nyx-closeup.png --output /tmp/nyx.glb
bun run operator:intake -- nyx /tmp/nyx.glb public/operator/nyx/poster.webp
```

The build keeps the humanoid skin, uses Meshoptimizer simplification without an `EXT_meshopt_compression` runtime dependency, limits geometry to 80k triangles, creates 2K base-color/emissive atlases and writes the six canonical semantic actions.

## Validate assets

During development, missing production files are reported but do not fail the command:

```bash
bun run operator:validate
```

Before tagging a release that claims production operators are complete, use strict validation:

```bash
bun run operator:validate:strict
```

Validation checks the GLB container, self-contained packaging, runtime-compatible glTF extensions, embedded texture resolution, PBR/emissive material contract, default scene, six non-zero canonical animation clips, triangle budget, material count, skin/joint budget, inverse-bind counts, and JOINTS_0 / WEIGHTS_0 accessor coverage. Poster existence and file size are also checked.

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
- Materials are cloned by the runtime without overriding their authored opacity or depth-write contract. Skin, eyes, hair and suit stay solid; only explicitly transparent material groups may blend.
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
