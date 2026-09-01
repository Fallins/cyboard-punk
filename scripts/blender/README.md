# CYBOARD Blender operator handoff

This folder contains Blender-side helpers for exporting production NYX / AXON assets into CYBOARD.

The helper does **not** create the character. It standardizes validation and export after the approved model, rig, materials and six animation actions exist in a `.blend` file.

## Export NYX

From the repository root:

```bash
blender --background /path/to/nyx.blend \
  --python scripts/blender/export_operator.py -- nyx
```

The helper checks:

- mesh exists
- humanoid armature exists
- 20–120 bone target
- <= 80k evaluated triangles
- <= 12 materials target
- exact required actions: `idle`, `observing`, `processing`, `warning`, `success`, `offline`

It then exports:

```text
public/operator/nyx/nyx.glb
```

After export, run:

```bash
bun run operator:validate
```

Before a release that claims production operators are complete:

```bash
bun run operator:validate:strict
```

## Export AXON

```bash
blender --background /path/to/axon.blend \
  --python scripts/blender/export_operator.py -- axon
```

## Compression

The current CYBOARD loader intentionally uses plain `GLTFLoader` without Draco, Meshopt, or KTX2 decoders. The Blender helper therefore keeps Draco disabled, and the Node validator rejects runtime-unsupported compressed GLBs.

Do not enable a new glTF compression extension only in Blender. Add the matching Three.js decoder to CYBOARD first, add tests, then update the canonical operator manifest / validator contract.

## NYX source of truth

See:

- [`../../docs/operator-characters.md`](../../docs/operator-characters.md)
- [`../../docs/operator-references/nyx-v1/README.md`](../../docs/operator-references/nyx-v1/README.md)
- [`../../docs/operator-references/nyx-v1/production-checklist.md`](../../docs/operator-references/nyx-v1/production-checklist.md)
