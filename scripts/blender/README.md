# CYBOARD Blender operator handoff

This folder contains Blender-side helpers for preparing and exporting production NYX / AXON assets into CYBOARD.

The helpers do **not** create the character mesh. They standardize semantic actions, scene validation, and GLB export after an approved model and rig exist in a `.blend` file.

## 1. Build CYBOARD semantic actions

After the humanoid rig exists, open the `.blend` file and run:

```bash
blender /path/to/nyx.blend \
  --python scripts/blender/build_operator_actions.py
```

The script resolves common humanoid head / neck / chest / forearm bone names and creates restrained command-center actions:

```text
idle
observing
processing
warning
success
offline
```

It intentionally uses small head, chest and forearm motion so the character remains suitable for an always-visible desktop utility. These generated actions are a production starting point and must still be previewed in Blender.

If canonical actions already exist, the script refuses to overwrite them. To intentionally replace them:

```bash
blender /path/to/nyx.blend \
  --python scripts/blender/build_operator_actions.py -- --force
```

If your auto-rig uses unusual bone names, extend `BONE_ALIASES` in `build_operator_actions.py` rather than manually renaming the entire rig.

## 2. Export NYX

From the repository root:

```bash
blender --background /path/to/nyx.blend \
  --python scripts/blender/export_operator.py -- nyx
```

The export helper checks:

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

## 3. Transactional candidate intake

If a GLB was generated outside the repository, use the intake command instead of overwriting a working model manually:

```bash
bun run operator:intake -- nyx /path/to/candidate.glb
```

With a poster:

```bash
bun run operator:intake -- nyx /path/to/candidate.glb /path/to/poster.webp
```

The previous asset is restored automatically when validation fails.

## AXON

Use the same flow with `axon`:

```bash
blender --background /path/to/axon.blend \
  --python scripts/blender/export_operator.py -- axon
```

## Compression

The current CYBOARD loader intentionally uses plain `GLTFLoader` without Draco, Meshopt, or KTX2 decoders. The Blender helper keeps Draco disabled, and the Node validator rejects runtime-unsupported compressed GLBs.

Do not enable a new glTF compression extension only in Blender. Add the matching Three.js decoder to CYBOARD first, add tests, then update the canonical operator manifest / validator contract.

## NYX source of truth

See:

- [`../../docs/operator-characters.md`](../../docs/operator-characters.md)
- [`../../docs/operator-references/nyx-v1/README.md`](../../docs/operator-references/nyx-v1/README.md)
- [`../../docs/operator-references/nyx-v1/production-checklist.md`](../../docs/operator-references/nyx-v1/production-checklist.md)
