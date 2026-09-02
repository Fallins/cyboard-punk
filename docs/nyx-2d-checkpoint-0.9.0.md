# NYX 2D Checkpoint — 0.9.0

Date: 2026-09-02

## Added since 0.8.0

- provider `attentionTarget` contract
- provider-directed iris micro-gaze preview
- gaze damping when target changes
- state-aware head posture bias
- faster asymmetric inhale/exhale breathing

## Attention target

Priority:

```text
warning provider with lowest remaining
→ active provider
→ center
```

Supported targets:

```text
center
codex
claude
cursor
```

`OperatorStage` exposes the resolved value as:

```text
data-attention-target
```

The renderer consumes that value; provider business logic does not live inside Three.js.

## Gaze preview

Enable with:

```bash
VITE_NYX_2D_GAZE=1
```

The preview reconstructs only the tiny original iris footprint from adjacent sclera, then reuses the approved iris/pupil pixels at a shifted location.

Bounds are intentionally small:

```text
horizontal UV <= 0.0062
vertical UV <= 0.0028
```

Provider mapping follows the dashboard layout:

- Codex: upper-left
- Claude: lower-left
- Cursor: upper-right
- center: tiny wandering only

Target changes are damped in runtime instead of snapping.

## Full current life preview

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HEAD_MOTION=1 \
VITE_NYX_2D_BREATH=1 \
VITE_NYX_2D_BLINK=1 \
VITE_NYX_2D_GAZE=1 \
bun run tauri dev
```

## QA priorities

1. eye reconstruction must not visibly whiten/darken the face around the eyes
2. iris must remain inside the natural eye aperture
3. gaze direction should correspond to provider panel location
4. blink must cover the moved iris correctly
5. head motion must still feel attached at the collar
6. breathing must read without rubber-body compression
7. reduced-motion and offline must freeze head/breath/gaze/blink

## Performance behavior

- blink/gaze preview raises motion cap to 30 FPS
- gaze is one extra draw call only when enabled
- blink plane is hidden between blink events and contributes no draw call then
- no per-frame geometry allocation
- gaze damping reuses persistent `THREE.Vector2`

## Next step

Hair follow-through remains blocked on a safe non-ghosting hair partition. The next implementation should build the hair spring/driver contract and a validated hair mask/reconstruction preview before moving visible hair pixels.
