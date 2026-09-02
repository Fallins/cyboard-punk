# NYX 2D Checkpoint — 0.10.3

## Scope

This checkpoint fixes runtime state-transition continuity without changing approved NYX artwork or anatomy layers.

## Live-state continuity

The following states share one continuous animation lifecycle:

```text
idle
observing
processing
warning
success
```

Transitions inside this live band must **not** restart the NYX 2D RAF or reset head/body/gaze/hair to neutral.

`OperatorStage` therefore keeps the latest live runtime state in a plain state ref. `Nyx2DWebGL` still reads the latest state every animation frame, but Solid does not retrigger its lifecycle effect merely because `processing` became `warning`, `success`, etc.

The only state-level lifecycle boundary is:

```text
live <-> offline
```

Entering offline may stop/reset the renderer. Leaving offline may restart it.

Visibility and reduced-motion remain independent hard lifecycle boundaries.

## Expected result

Before this checkpoint:

```text
processing
-> stop RAF
-> reset head/body/gaze/hair
-> neutral frame
-> restart warning
```

After this checkpoint:

```text
processing motion
-> warning targets take over on the existing clock
-> no forced neutral frame
```

Small target differences between states may still blend visually through their existing channel damping / motion design, but the renderer itself no longer injects a neutral snap.

## Hair status

Hair follow-through remains opt-in and uses the 0.10.2 outer-fringe weighted mask. Synthetic blink remains quarantined.

## Full preview command

Use:

```bash
bun run operator:preview:2d
```

This launches Tauri dev with:

```text
VITE_NYX_RENDERER=2d
VITE_NYX_2D_HEAD_MOTION=1
VITE_NYX_2D_BREATH=1
VITE_NYX_2D_GAZE=1
VITE_NYX_2D_HAIR_MOTION=1
VITE_NYX_2D_BLINK=0
```

## QA focus

1. Processing -> warning must not flash through neutral pose.
2. Warning -> processing must not restart breathing from exhale.
3. Success entry must not visibly reset the head/collar seam.
4. Hair spring must keep its existing momentum across live state changes.
5. Entering offline is allowed to settle/reset.
6. Reduced-motion and hidden-window behavior must still stop motion.
