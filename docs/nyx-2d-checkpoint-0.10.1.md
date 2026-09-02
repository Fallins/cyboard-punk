# NYX 2D checkpoint 0.10.1

Date: 2026-09-02

This checkpoint replaces the previous perpetual head sine loop with an anchored posture model based on frame-by-frame review of the recorded NYX motion.

## Problem observed

The previous motion read as a detached cutout because:

- head X/Y/rotation ran continuously
- torso breathing ran on an independent phase
- the neck/collar partition therefore stretched and compressed visually
- continuous periodic movement made the head feel like a floating layer rather than a human posture adjustment

## 0.10.1 behavior

Head motion now uses deterministic posture cycles:

```text
hold neutral
→ small adjustment
→ hold
→ settle
→ hold neutral
```

Typical cycle duration is 8.8 s, but only about 2 s of that cycle contains active posture travel.

### Horizontal motion

Horizontal translation is reduced to a small fraction of the declared head envelope. It is no longer the primary life signal.

### Vertical motion

Independent Y oscillation is removed.

The head now inherits 58% of the same `nyx2DBreathPoseAtTime(...).translateY` phase used by the torso. This keeps the neck anchor moving with breathing instead of stretching against it.

### Rotation

Rotation carries most of the visible posture adjustment and remains around the neck/base-of-skull pivot. The target alternates direction between deterministic cycles rather than oscillating continuously.

### State posture

- `processing`: very small settled downward bias
- `warning`: smaller movement envelope
- `observing`: tiny attentive roll bias, nearly zero X travel
- `success`: one short acknowledgement, not a repeating bob
- `offline`: static

## Testing contract

`nyx2dMotion.test.ts` now verifies behavior rather than sine-wave peak timestamps:

- starts neutral
- holds before adjusting
- X remains tiny
- rotation is the dominant posture signal
- returns to held neutral
- head Y follows the breathing phase
- offline remains static
- declared v1 envelope remains enforced

## Visual QA

Run:

```bash
VITE_NYX_RENDERER=2d \
VITE_NYX_2D_HEAD_MOTION=1 \
VITE_NYX_2D_BREATH=1 \
bun run tauri dev
```

Primary acceptance criteria:

1. neck no longer appears to slide horizontally
2. neck length does not visibly pump against breathing
3. head spends noticeable time still
4. posture adjustments read as small human corrections, not a pendulum loop
5. rotation feels anchored around the neck rather than translating the entire cutout
