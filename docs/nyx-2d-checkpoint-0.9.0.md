# NYX 2D Checkpoint — 0.9.0

Date: 2026-09-02

## Added since 0.8.0

- provider `attentionTarget` contract
- provider-directed iris micro-gaze preview
- gaze damping when target changes
- state-aware head posture bias
- faster asymmetric inhale/exhale breathing
- bounded hair spring driver contract
- face-safe outer-hair mask debug gate

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

`OperatorStage` exposes the resolved value as `data-attention-target`. The renderer consumes that value; provider business logic does not live inside Three.js.

## Gaze preview

Enable with:

```bash
VITE_NYX_2D_GAZE=1
```

The preview reconstructs only the tiny original iris footprint from adjacent sclera, then reuses the approved iris/pupil pixels at a shifted location.

Bounds:

```text
horizontal UV <= 0.0062
vertical UV <= 0.0028
```

Provider mapping follows the dashboard layout:

- Codex: upper-left
- Claude: lower-left
- Cursor: upper-right
- center: tiny wandering only

Target changes are damped instead of snapping.

## Hair spring contract

The hair spring math exists but visible hair pixels are not moved yet.

Properties:

- mutable persistent state; no per-frame object allocation required
- angle hard-capped by the declared `1.2°` v1 hair envelope
- target follows opposite to head roll / horizontal travel
- `dt` is capped at `1/20s`, so resume after hidden/background cannot explode the spring
- reset returns angle and angular velocity to exact neutral

## Face-safe hair mask gate

The first movable-hair candidate deliberately excludes the protected face.

Safe zones:

```text
hairOuterLeft
hairCrown
hairOuterRight
```

Bangs/fringe are not included yet.

Enable the mask overlay with:

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HAIR_MASK_DEBUG=1 \
bun run tauri dev
```

The overlay should highlight only outer violet hair pixels. It must not include:

- face / eyes / eyebrows
- collar
- chest core
- suit emissive lines

The mask is debug-only and does not move hair.

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
8. hair mask must remain outside protected face and avoid suit/collar neon

## Performance behavior

- blink/gaze preview raises motion cap to 30 FPS
- gaze is one extra draw call only when enabled
- blink plane is hidden between blink events and contributes no draw call then
- hair mask adds one draw call only in explicit debug mode
- no per-frame geometry allocation
- gaze damping reuses persistent `THREE.Vector2`
- hair spring uses persistent mutable numeric state

## Next blocking gate

Do not move visible hair until the safe mask is visually accepted. After mask QA:

1. construct a non-ghosting outer-hair partition
2. reconstruct the tiny hidden background behind moved outer hair
3. connect the already-tested spring driver
4. keep bangs/fringe static until a dedicated face-safe reconstruction exists
