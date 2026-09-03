# NYX 2D Checkpoint 0.22.0 — Torso / Weight Shift Polish

## Status

`0.22.0` extends the user-approved shoulder-cap behavior from `0.21.1` with source-safe torso weight transfer.

This release does **not** add another sprite layer, hidden-body reconstruction, or alternate NYX artwork. Visible RGB remains the canonical `941×1672` master.

Blink remains blocked.

## Goal

The articulated arm chain now has a body-level reason to move.

Previous behavior could read as:

```text
forearm -> upper arm -> shoulder
```

while the trunk remained visually close to a flat card.

`0.22.0` adds a restrained spine-weighted response:

```text
semantic state
  -> ribcage / weight shift
  -> shoulder cap
  -> upper arm
  -> exact elbow anchor
  -> forearm
```

The lower torso supplies a small counter-shift instead of translating the whole character laterally.

## Spine-weighted torso contract

`src/ui/nyx2dGeometry.ts` now derives a vertical torso profile from the existing torso zone.

- upper chest follow: approaches `1.0`;
- mid torso: blends between chest and waist behavior;
- lower torso: lateral shift reverses at only `22%` of the upper-body magnitude;
- lower torso yaw influence is reduced to `58%` of upper-chest yaw influence;
- legs and pelvis outside the torso zone remain untouched.

This makes the ribcage follow a gesture while preserving a stable base.

The transform remains mesh-only and source-safe. No missing side-body pixels are invented.

## Semantic torso intent

Forearm angles remain the approved `0.20` language and shoulder angles remain the `0.21` language.

`0.22` adjusts only torso intent:

| State | Torso yaw | Torso shift X | Torso lean | Intent |
| --- | ---: | ---: | ---: | --- |
| `idle` | 0 | 0 | 0° | neutral |
| `observing` | +0.08 | +0.0013 | +0.20° | light attention toward active side |
| `processing` | +0.14 | +0.0022 | +0.42° | strongest deliberate engagement |
| `warning` | 0 | 0 | -0.30° | centered brace / pull back |
| `success` | -0.08 | -0.0013 | +0.18° | restrained opposite-side acknowledgement |
| `offline` | 0 | 0 | 0° | neutral/static |

All values remain below the existing hard calibration envelope:

- torso yaw `±0.16`;
- torso X shift `±0.003`;
- torso lean `±0.6°`.

## Body-led timing

The arm chain still uses current-to-target travel-based transition duration.

Torso interpolation now finishes slightly earlier than the arm chain:

```ts
torsoProgress = progress / 0.92
```

before the same smooth easing is applied.

This makes the body lead the gesture subtly instead of torso / shoulder / elbow reading like synchronized servos.

There is no overshoot or secondary settle segment.

## Preserved correctness contracts

`0.22.0` keeps all previously approved fixes:

1. breathing remains fixed at `2.00x` and continuous across live-state changes;
2. shoulder-cap deformation remains source-guided and local;
3. body mesh remains `24×40` (`1025` vertices / `1920` body triangles);
4. exact breathing-aware elbow anchors are published by the body mesh;
5. forearm layers consume those exact endpoints;
6. source-alpha forearm segmentation remains the only limb extraction method;
7. no generated armpit/shoulder/body repair path exists;
8. `OperatorStage` remains persistently mounted;
9. NYX 3D remains retired;
10. blink remains disabled.

## Regression guards

Tests now assert that:

- the shoulder cap itself moves while chest center stays protected;
- upper chest follows a positive lateral semantic shift;
- lower waist counter-shifts in the opposite direction;
- lower counter-shift remains smaller than chest travel;
- semantic torso values remain inside calibration limits;
- PROCESS has stronger torso engagement than OBSERVE;
- WARNING remains centered and pulled back;
- SUCCESS uses the opposite torso direction;
- torso interpolation leads the elbow chain slightly.

`operator:validate:release` requires the spine-weighted functions and constants, so a future whole-torso translation cannot silently replace this contract.

## QA

Run:

```bash
bun run check
bun run tauri dev
```

Enable NYX test controls and use the production baseline:

```text
BREATH      2.00x
FOREARMS    1.00x
UPPER BODY  1.00x
HEAD        1.00x
```

Inspect:

```text
IDLE -> OBSERVE -> PROCESS -> WARNING -> SUCCESS -> IDLE
```

Then compare with:

```text
UPPER BODY = 0.00x
```

The `0.00x` pass should retain forearm motion while removing shoulder and torso support.

## Acceptance criteria

1. OBSERVE shows only a light ribcage/shoulder engagement.
2. PROCESS visibly commits the upper torso toward the operating side more than OBSERVE.
3. The waist does not slide in the same direction as the chest; it should read as a stable counterbalance.
4. WARNING remains centered and slightly braced backward rather than swaying laterally.
5. SUCCESS moves the body in the opposite, calmer direction from PROCESS.
6. The torso begins/settles slightly before the arm finishes without producing a visible pause.
7. Shoulder, elbow, and forearm remain connected through the full `2.00x` breath cycle.
8. No body hole, ghost limb, duplicate arm, or shoulder-card artifact appears.
9. Legs and lower-body silhouette remain visually stable.
10. NYX identity, face, suit design, and canonical RGB remain unchanged.
