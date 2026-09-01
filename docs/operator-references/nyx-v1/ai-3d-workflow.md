# NYX v1.0 — AI-assisted 3D workflow

This workflow is the preferred fast path from the locked NYX reference package to a candidate production GLB.

It is intentionally split into mesh generation, rigging, semantic action generation, and CYBOARD validation. Do not treat the first AI-generated mesh as production-ready.

## Recommended path

```text
Locked NYX references
  -> multi-view image-to-3D mesh + PBR
  -> silhouette/anatomy review
  -> humanoid auto-rig
  -> Blender CYBOARD semantic actions
  -> Blender CYBOARD export helper
  -> Node asset validator
  -> Tauri real-device smoke test
```

A practical current tool combination is:

- multi-view image-to-3D service for geometry / PBR (for example a workflow that accepts front/side/back references and A-pose output)
- humanoid auto-rig service that accepts GLB/FBX
- Blender for final action review / export

The repository is deliberately vendor-neutral; vendor output must satisfy CYBOARD's asset contract regardless of which service produced it.

## Step 1 — Generate the base 3D character

Use the locked references in this order:

1. A-pose front / side / back sheet
2. turnaround/detail sheet
3. face/upper-body close-up
4. hero concept

Generation requirements:

```text
Adult female cyber-tech operator NYX.
Preserve the supplied multi-view character exactly.
Neutral A-pose.
Full prominent bust, narrow defined waist, curvy hips, long elegant legs.
Do not flatten or average the body toward generic unisex proportions.
Short black-purple bob haircut.
Matte black polymer operator suit with smoked translucent upper panels,
dark metal structure, cyan/magenta/violet emissive seams,
and a small diamond energy core high on the sternum.
Game-ready clean topology preferred.
PBR materials.
No weapon, no environment, no pedestal, no loose props.
```

### Reject the generated mesh immediately if

- bust projection is materially smaller than the A-pose reference
- waist is widened into a generic torso
- hips/glute silhouette is reduced
- legs become noticeably shorter
- face identity drifts from the approved close-up
- boots lose the approved heel/shape
- diamond core becomes a generic round reactor
- suit is simplified into an unrelated catsuit

Do not try to fix a fundamentally wrong silhouette downstream with textures.

## Step 2 — Mesh cleanup / retopology review

Before rigging, compare the candidate against the A-pose reference in orthographic views.

Target:

- <= 80k visible triangles
- clean shoulder / chest / hip / knee deformation loops
- separate readable material regions
- no fused arms/torso or fused legs
- no floating or intersecting suit panels
- no accidental interior geometry
- hands have a clean silhouette
- face does not contain obvious reconstruction artifacts

If auto-generated topology is poor, remesh/retopologize before auto-rigging.

## Step 3 — Auto-rig

The rigged candidate must remain in the locked A-pose silhouette.

Requirements:

- standard biped humanoid skeleton
- 20–120 unique joints target
- clean weights around shoulder, bust/chest, hip/glute, elbow and knee regions
- head/neck controls available
- forearm/hand bones available for small interface gestures
- no mandatory physics rig

After auto-rigging, test small arm raises and torso bends. Reject or repaint weights if the suit collapses across the bust, shoulder, waist, or hip silhouette.

## Step 4 — Build CYBOARD semantic actions

Open the rigged model in Blender and run:

```bash
blender /path/to/nyx.blend \
  --python scripts/blender/build_operator_actions.py
```

This creates:

```text
idle
observing
processing
warning
success
offline
```

Preview every clip. The helper intentionally keeps motion subtle; adjust bone aliases or keyframes when the imported rig uses unusual axes/naming.

## Step 5 — Export through the CYBOARD helper

```bash
blender --background /path/to/nyx.blend \
  --python scripts/blender/export_operator.py -- nyx
```

The helper blocks obvious production failures before export.

## Step 6 — Validate / intake

If the Blender helper exported directly into the repo:

```bash
bun run operator:validate
```

If the candidate GLB came from another tool:

```bash
bun run operator:intake -- nyx /path/to/nyx.glb
```

With poster:

```bash
bun run operator:intake -- nyx /path/to/nyx.glb /path/to/poster.webp
```

Release gate:

```bash
bun run operator:validate:strict
```

## Step 7 — Real-device acceptance

Run:

```bash
bun run tauri dev
```

Verify:

- GLB replaces the procedural operator
- framing keeps face, bust/core and upper-body silhouette readable in the Hero panel
- provider HUD does not cover the face or diamond core
- `processing` activates with a live agent
- manual refresh produces `observing`, then healthy `success`
- quota pressure produces `warning`
- reduced-motion uses the poster path
- character does not become visually transparent or washed out
- runtime performance remains acceptable on the target Mac

## Important rule

AI 3D output is a source asset, not design authority. The locked NYX v1 references remain authoritative throughout mesh generation, rigging, animation, and runtime tuning.
