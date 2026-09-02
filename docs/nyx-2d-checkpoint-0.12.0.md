# NYX 2D Checkpoint — 0.12.0

Status: **PERFORMANCE PROFILE / TELEMETRY CHECKPOINT**

## Production default

Normal launch:

```bash
bun run tauri dev
```

uses:

```text
renderer: 2d
profile: stable
head posture: on
breathing: on
emissive/core response: on
gaze: off
hair: off
blink: quarantined
```

## Enhanced preview

```bash
bun run operator:preview:2d
```

uses profile `enhanced` and explicitly enables gaze + hair follow-through.

The profile does not silently enable experimental channels. Feature flags remain explicit so a performance/profile change cannot unexpectedly alter NYX visuals.

## Runtime performance budgets

Stable soft budget:

```text
draw calls <= 8
triangles <= 2200
geometries <= 8
textures <= 8
render time <= 12 ms
```

Enhanced soft budget:

```text
draw calls <= 12
triangles <= 2600
geometries <= 10
textures <= 10
render time <= 16 ms
```

These are diagnostic targets only. The runtime must not automatically degrade NYX visual fidelity when a target is exceeded.

## Sustained warning behavior

A single slow frame is ignored.

A performance warning is exposed only after **5 consecutive violating snapshots**. One healthy snapshot clears the streak immediately.

The operator stage exposes:

```text
data-nyx-2d-profile="stable|enhanced"
data-nyx2d-performance="ok|warning"
data-nyx2d-performance-streak="N"
data-nyx2d-performance-violations="..."
```

The renderer host continues to expose raw metrics:

```text
data-render-ms
data-draw-calls
data-triangles
data-geometries
data-textures
```

A transition into sustained warning logs one console warning. It does not spam every frame.

## QA goals

1. Normal stable launch should remain visually identical to 0.11.0.
2. No visible performance diagnostic UI should appear.
3. Head / breath / state continuity must not change.
4. Enhanced preview should retain gaze/hair behavior from 0.10.x.
5. Stable should normally remain `data-nyx2d-performance="ok"` on the target Mac.
6. Enhanced can use the wider enhanced budget but must not silently downgrade fidelity.

## Next gate

Use measured stable/enhanced metrics to decide whether gaze and/or hair can graduate into the production profile. Visual QA remains mandatory; passing a performance budget alone is not sufficient.
