# NYX 2D Checkpoint 0.19.4 — Motion Continuity / Persistent Mount

## Scope

This checkpoint fixes three runtime issues observed in the 2026-09-03 visual QA recording:

1. torso breathing visibly jumped when semantic state changed;
2. forearm motion visibly hitched near the end of the transition;
3. the entire operator could disappear and be replaced by the central `CY` loading fallback while the app/resource tree updated.

## Fixes

### 1. Live-state breathing continuity

Breathing no longer changes frequency or amplitude between `idle`, `observing`, `processing`, `warning`, and `success`.

All live states share one continuous breath oscillator at the approved `2.00x` production intensity. `offline` remains static.

A semantic state change therefore does not change breath phase or torso geometry at the transition boundary.

### 2. Continuous forearm easing

The rejected two-stage forearm ease reached ~96% of the target, decelerated to zero around 80% progress, then started a second short settle segment. That created a visible hitch.

0.19.4 uses one continuous smoother-step curve across the entire transition. Bilateral warning motion may still keep its small right-arm delay, but each arm follows one uninterrupted easing curve.

### 3. Persistent OperatorStage mount

`OperatorStage` is now statically imported by `App.tsx` and is no longer wrapped in a runtime `Suspense` boundary.

Provider resource refreshes, simulator state changes, and other app updates must not replace the production operator with the `CYBOARD operator loading` fallback.

The `CY` fallback remains only for the explicit operator-disabled state.

## Regression guards

- Breath tests require identical torso pose for all live semantic states at the same elapsed time.
- Forearm tests require continuous movement through the old 80% settle boundary.
- `operator:validate:release` requires a static `OperatorStage` import and rejects reintroducing `lazy(() => import('./OperatorStage'))` or `<Suspense` into the production operator path.

## QA

Run:

```bash
bun run check
bun run tauri dev
```

With NYX test controls enabled:

1. rapidly switch `IDLE -> OBSERVE -> PROCESS -> WARNING -> SUCCESS` and verify breathing does not jump;
2. watch the final 20% of forearm travel and verify it decelerates continuously without a stop/restart hitch;
3. switch states repeatedly for at least one provider refresh cycle and verify the central `CY` loading fallback never appears;
4. confirm the 0.19.3 source-alpha forearm cleanup still leaves no detached ghost limbs.

Blink remains blocked.
