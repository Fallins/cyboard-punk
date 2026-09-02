# NYX 2D Checkpoint 0.18.1 — State Motion Visibility Fix

## Why this patch exists

A real 912×678 / ~57 FPS Dashboard recording showed that the state simulator was changing runtime state correctly, but the character itself remained visually almost identical across `idle`, `observing`, `processing`, `warning`, and `success`.

Frame-by-frame review isolated two causes:

1. State-entry CSS transforms peaked at sub-percent values that resolved to roughly 0–1 visible pixels at the recorded Dashboard size.
2. After the 0.8–1.05 second entry gesture ended, all live states returned to nearly the same continuous head/breath motion. State differences were mostly scalar rather than semantic posture.

The simulator was therefore not the failure. `success` visibly changed the surrounding halo and `offline` crossed a lifecycle boundary, confirming that state override reached production runtime state.

## 0.18.1 motion contract

NYX now uses three non-destructive layers for readable state motion:

- **Entry acknowledgement:** pixel-based whole-operator motion with a visible 2–4 px peak.
- **Held state stance:** a tiny persistent whole-operator transform outside the head/body rig so each held state remains distinguishable after the entry animation ends.
- **Continuous motion activity:** observing remains most alert, processing is quieter/focused, warning braces nearly still, success relaxes, and idle remains neutral baseline.

The held stance is applied by `Nyx2DManagedRuntime` through `nyx2dStatePose.ts`. It does not modify source pixels and does not reopen the neck partition.

## Safety bounds

Held stance is constrained to:

- translation <= 3 px per axis
- rotation <= 0.3 degrees
- scale within 0.992–1.008

Entry gestures remain one-shot and do not loop.

Reduced Motion removes both entry animation and held stance transforms.

## Expected visual signatures

- `IDLE`: neutral baseline.
- `OBSERVE`: attention lift/settle, then a subtly raised alert stance with the most active head posture.
- `PROCESS`: focus dip/settle, then a slightly lower/contracted stance and quieter head motion.
- `WARNING`: short brace, then a wider/stabler held stance with strongly reduced head movement.
- `SUCCESS`: clear upward acknowledgement, then a slightly lifted relaxed stance.
- `OFFLINE`: neutral static lifecycle state.

## QA

Run:

```bash
bun run check
bun run tauri dev
```

Enable `Settings -> NYX test controls` and test:

`AUTO -> IDLE -> OBSERVE -> PROCESS -> WARNING -> SUCCESS -> OFFLINE`

PASS if each live semantic state has both a visible entry reaction and a distinguishable held posture without neck separation, whole-character floating, face distortion, or repeated bouncing.

FAIL if only halo/status colors change, if the character returns to an indistinguishable idle pose after ~1 second, or if any gesture reads as a large cut-out/card translation.
