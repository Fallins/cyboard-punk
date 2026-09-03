# NYX 2D Checkpoint 0.21.0 — Source-Guided Upper Body Rig

## Status

`0.21.0` is the second-stage 2.5D upper-body checkpoint.

It extends the user-approved `0.20.0` forearm articulation without replacing or regenerating NYX artwork.

Visible RGB remains the canonical `941×1672` `master.webp`. Approved orthographic/detail references are calibration evidence only; they are not alternate runtime textures.

## What changed

The runtime now combines:

- canonical body mesh;
- user-approved `2.00x` torso breathing;
- calibrated left/right upper-arm influence fields;
- restrained shoulder rotation;
- micro torso parallax;
- existing source-alpha forearm layers;
- exact per-frame elbow anchor handoff between body mesh and forearm layers;
- existing anchored head, gaze, hair follow-through, and emissive/core response.

Blink remains blocked.

## Source/calibration contract

Upper-body anatomy is constrained by the locked NYX references in `assets/operator/nyx/source-lock.json`.

Calibration metadata is centralized in `src/ui/nyx2dUpperBodyCalibration.ts`.

Reference roles:

- orthographic `1448×1086`: shoulder/arm proportion and front/side/back structure;
- detail sheet `1536×1024`: upper-body suit and joint confirmation;
- canonical master `941×1672`: the only visible runtime RGB source.

No shoulder sprite, generated armpit repair, hand-painted erase polygon, or alternate NYX render is introduced.

## Safety envelope

Upper-body semantic motion is intentionally small:

- shoulder rotation hard limit: `±7°`;
- torso yaw hard limit: `±0.16` normalized;
- torso X shift hard limit: `±0.003` world units;
- torso lean hard limit: `±0.6°`.

The test control formerly reserved for retired torso motion is now `UPPER BODY`:

- production default: `1.00x`;
- QA range: `0.00x–1.50x`;
- `0.00x` restores the previously approved forearm-only upper-body behavior without disabling forearm articulation.

## Semantic poses

Forearm angles remain the `0.20.0` language; 0.21 adds only restrained shoulder/torso support.

| State | Left shoulder | Left elbow | Right shoulder | Right elbow | Torso intent |
| --- | ---: | ---: | ---: | ---: | --- |
| `idle` | 0° | 0° | 0° | 0° | neutral |
| `observing` | 0° | 0° | +3.2° | -56° | tiny rightward attention |
| `processing` | 0° | 0° | +5.4° | -98° | slightly deeper right-side engagement |
| `warning` | -4.2° | +76° | +4.8° | -84° | restrained bilateral brace |
| `success` | -3.2° | +68° | 0° | 0° | small left-side acknowledgement |
| `offline` | 0° | 0° | 0° | 0° | neutral/static |

Transition timing continues to use current-to-target arm travel with the existing continuous smoother-step curve.

## Exact elbow-anchor contract

A key 0.21 correctness rule is that the forearm layer must not independently approximate the elbow position.

Per rendered frame:

1. the semantic articulation pose is published to `nyx2dArticulationFrame`;
2. body geometry applies breathing, torso parallax, and weighted shoulder deformation;
3. body geometry transforms the exact calibrated left/right elbow source points with the same math;
4. those final world-space elbow endpoints are published as articulation anchors;
5. the movable forearm groups consume those exact endpoints and then apply shoulder + elbow rotation.

This prevents the forearm pivot from remaining at the old source coordinate while breathing or shoulder motion moves the upper arm.

`resetNyx2DBodyGeometry()` also restores neutral elbow anchors, so static/reduced-motion/lifecycle resets cannot retain a stale animated endpoint.

## Geometry/performance

The canonical body plane is now `16×32` segments (`561` vertices) so left and right upper arms can receive separate feathered influence fields.

This does not add an upper-arm texture or draw call. The only movable limb textures remain the two source-alpha forearm crops.

The live deformation path is persistent/allocation-free at frame level: articulation pose storage, exact elbow-anchor storage, mesh scratch points, shoulder pivots, and forearm exact-anchor consumption reuse existing objects. Runtime code does not rebuild geometry or allocate one `{x,y}` object per vertex/frame.

Performance budgets remain soft diagnostics; no automatic visual degradation is introduced.

## Release guards

`operator:validate:release` now requires:

- calibration-driven left/right upper-arm weights;
- the `16×32` body mesh contract;
- source-locked upper-body safety limits;
- shared semantic articulation frame;
- exact elbow-anchor publication from body geometry;
- exact anchor consumption by the forearm layer;
- the existing source-alpha forearm mask contract;
- absence of generated shoulder/upper-arm sprite or repair paths.

## QA

Run:

```bash
bun run check
bun run tauri dev
```

Enable NYX test controls and first keep:

```text
BREATH      2.00x
FOREARMS    1.00x
UPPER BODY  1.00x
HEAD        1.00x
```

Then inspect:

```text
IDLE -> OBSERVE -> PROCESS -> WARNING -> SUCCESS -> IDLE
```

Also test direct transitions:

```text
WARNING -> PROCESS
PROCESS -> OBSERVE
SUCCESS -> WARNING
```

Finally set `UPPER BODY = 0.00x` and repeat the sequence. This is the comparison baseline against the approved forearm-only 0.20 behavior.

## Acceptance criteria

1. Shoulder movement reads as support for the forearm gesture, not a detached rotating shoulder plate.
2. No visible hole, duplicate shoulder, generated armpit patch, or body/arm split appears.
3. Elbow connection remains visually continuous throughout the `2.00x` breathing cycle.
4. Elbow connection remains continuous while shoulder and torso motion are both active.
5. OBSERVE stays lighter than PROCESS.
6. WARNING remains asymmetric and does not read as synchronized servo motion.
7. SUCCESS stays calmer than WARNING.
8. `UPPER BODY = 0.00x` cleanly returns to forearm-only behavior.
9. NYX face, body proportions, suit design, and canonical RGB identity do not change.
10. Blink remains disabled.
