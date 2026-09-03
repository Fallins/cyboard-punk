# NYX 2D Checkpoint 0.19.1 — Source-safe forearm rig

## Status

0.19.0 articulated-arm V1 was rejected after frame-by-frame review of the real Dashboard recording. The failure was structural, not a tuning issue:

- shoulder-to-hand capsule masks captured unrelated torso/shoulder pixels;
- large body reconstruction patches exposed visibly dirty copied pixels when arms moved;
- shoulder, elbow, and torso transforms moved together like servos;
- 420–680 ms transitions were too fast for 140–170 degree bends;
- pseudo torso yaw could separate the fixed body from the moving limb hierarchy.

0.19.1 replaces that strategy rather than tuning around it.

## Production rig

The source-safe semantic rig is now deliberately smaller:

- canonical head + anchored head motion;
- canonical shoulders and upper arms;
- canonical torso geometry, with approved breathing only;
- left forearm + hand rotating around the source elbow pivot;
- right forearm + hand rotating around the source elbow pivot;
- gaze / hair / emissive channels unchanged;
- blink remains source-gated and disabled.

No semantic state may rotate a shoulder or synthesize torso yaw in this checkpoint.

## Source cleanup strategy

`nyx2dArticulationLayer.ts` now:

- cuts only elbow-down forearm/hand pixels;
- uses explicit silhouette polygons rather than broad shoulder-to-hand capsules;
- preserves a small elbow overlap on the moving layer so the cuff can cover the fixed upper-arm joint;
- erases a narrower polygon from the body composite;
- limits reconstruction to a small body-side waist/hip overlap polygon;
- does not reconstruct the hand/silhouette region with copied body pixels;
- keeps the articulation root at canonical transform.

This trades maximum pose range for a much cleaner source silhouette.

## Semantic poses

At 1x forearm tuning:

| State | Left forearm | Right forearm | Intent |
| --- | ---: | ---: | --- |
| idle | 0° | 0° | canonical relaxed pose |
| observing | 0° | -78° | light inspection / attention |
| processing | 0° | -112° | clear one-hand console pose |
| warning | +92° | -92° | restrained two-forearm brace |
| success | +102° | 0° | opposite-hand acknowledgement |
| offline | 0° | 0° | static canonical pose |

Shoulder angles and torso articulation are always zero.

## Motion timing

The rejected servo-like timings are replaced with slower motion and an explicit settle phase:

- observing: 1200 ms;
- processing: 1350 ms;
- warning: 1050 ms;
- success: 1150 ms;
- return to idle/offline: 1100 ms.

The interpolation reaches roughly 96% of target during the main reach, then spends the final 20% settling without cartoon overshoot. Bilateral motion is slightly staggered so both forearms do not launch on exactly the same frame.

## Tuning controls

Test controls expose only channels that are actually meaningful:

- `BREATH` — production default 2.00x;
- `FOREARMS` — production default 1.00x, range 0–1.25x;
- `HEAD` — production default 1.00x.

The previous `TORSO` slider is removed from the simulator. The internal compatibility field is hard-clamped to zero.

## Release guard

`operator:validate:release` now rejects reintroduction of shoulder or torso transforms into the source-safe articulation layer without a deliberate contract change.

## Visual QA gate

Before expanding articulation again, verify on the real Dashboard:

1. IDLE has no visible limb seam compared with the canonical source.
2. PROCESS raises only the forearm; shoulder/chest pixels remain clean and stationary.
3. WARNING shows two forearms moving with a slight timing offset rather than synchronized servo motion.
4. SUCCESS uses the opposite forearm and remains visually distinct from WARNING.
5. Returning to IDLE takes about a second and decelerates naturally.
6. No copied dark/purple body fragment travels with the forearm.
7. Breathing remains the previously approved 2x production motion.

Only after this gate passes should shoulder articulation or multi-view torso turns be reconsidered. Those features require dedicated source-backed layers rather than reconstruction from the neutral master.
