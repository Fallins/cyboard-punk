# NYX 2D Checkpoint 0.21.1 — Visible Shoulder Cap Fix

## Status

`0.21.1` is a corrective patch on top of the 0.21 source-guided upper-body rig.

The 0.21 architecture was correct, but the first 12% of the upper-arm influence field used a `shoulderFade` that reduced the shoulder endpoint to zero motion. In practice the upper arm rotated while the visible shoulder stayed pinned, which made the motion read as a detached upper-arm deformation rather than a connected shoulder gesture.

## Fix

The retired shoulder pin is removed.

Upper-body deformation now uses two distinct fields:

- `upperArmWeight`: controls upper-arm rotation and remains full at the elbow so the exact forearm anchor stays connected;
- `shoulderCapWeight`: a local deltoid/shoulder-cap field centered on the calibrated shoulder point.

The shoulder cap receives a very small source-safe translation in addition to restrained rotation:

- upward lift hard maximum: `0.006` world units at the `7°` shoulder limit;
- inward shift hard maximum: `0.0022` world units;
- chest-side influence is clipped by `shoulderInwardAllowancePx` so the central chest/core does not move with the shoulder.

No alternate shoulder art, generated armpit pixels, repair patch, or extra shoulder sprite is introduced. Visible RGB remains the canonical NYX master.

## Mesh resolution

The canonical body mesh is raised from `16×32` to `24×40` segments:

- vertices: `1025`;
- body triangles: `1920`;
- still below the stable `2400` triangle diagnostic budget after the small auxiliary planes are included.

The higher density is necessary because the old horizontal/vertical spacing left too few vertices inside the shoulder cap for a visible smooth deformation.

## Exact chain continuity

The exact elbow anchor still uses the same body transform as the visible upper arm.

Shoulder lift/inward offset is therefore applied consistently to:

1. shoulder-cap mesh vertices;
2. upper-arm mesh vertices;
3. the exact calibrated elbow endpoint;
4. the movable forearm group that consumes that endpoint.

Breathing remains `2.00x` and continues on the same persistent clock.

## Regression contract

Tests now require:

- `1025` body vertices / `1920` body triangles;
- non-empty but localized left/right shoulder-cap influence sets;
- an engaged shoulder source point to move visibly upward and inward;
- the central chest point to remain pinned under isolated shoulder motion;
- exact elbow anchors to continue matching the body-point transform.

`operator:validate:release` also rejects the retired `shoulderFade` pin and requires the shoulder-cap calibration/deformation tokens.

## QA

Run:

```bash
bun run check
bun run tauri dev
```

Enable NYX test controls and keep:

```text
BREATH      2.00x
FOREARMS    1.00x
UPPER BODY  1.00x
HEAD        1.00x
```

Best states for shoulder inspection:

```text
IDLE -> PROCESS -> IDLE
IDLE -> WARNING -> IDLE
IDLE -> SUCCESS -> IDLE
```

Then compare with:

```text
UPPER BODY = 0.00x
```

Acceptance criteria:

1. PROCESS visibly engages the right shoulder/deltoid together with the upper arm.
2. WARNING visibly engages both shoulders without dragging the chest/core as one slab.
3. SUCCESS visibly engages the left shoulder but stays calmer than WARNING.
4. Shoulder movement is a few pixels at dashboard scale, not a large shrug.
5. Elbow/forearm connection remains continuous throughout breathing and state transitions.
6. No shoulder hole, duplicate limb, ghost edge, or generated repair appears.
