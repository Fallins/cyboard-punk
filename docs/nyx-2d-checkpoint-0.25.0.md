# NYX 2D Checkpoint — 0.25.0

Status: **PRODUCTION ACCEPTANCE / DIAGNOSTIC CLOSEOUT**

## Purpose

0.25.0 closes the foundational NYX 2.5D v1 work. It adds no new joint and does not redraw the character. The goal is to make the already approved motion stack observable, regression-resistant and ready for local production acceptance.

Blink is explicitly outside the v1 acceptance gate and remains quarantined until approved source-derived eyelid / closed-eye data exists.

## Production motion baseline

The production baseline remains:

```text
BREATH      2.00×
FOREARMS    1.00×
UPPER BODY  1.00×
HEAD        1.00×
```

NYX remains 2D-only and source-safe:

- canonical 941×1672 `master.webp` is the displayed character RGB source;
- source-alpha forearms are the only detached limb sprites;
- upper arms, shoulder caps and torso are weighted deformation of the canonical body mesh;
- exact elbow anchors are produced from the same deformed body frame consumed by the forearm layer;
- gaze, head direction, torso and semantic operation hand share provider attention intent;
- provider attention never restarts the renderer or breathing clock.

## Attention continuity

The old restartable provider-attention ease is retired.

Current response model:

- head attention: persistent damping, approximately 95% response in `280 ms`;
- torso / arm provider-side attention: persistent damping, approximately 95% response in `720 ms`;
- retargeting preserves the current filtered position and velocity direction instead of restarting from zero;
- rapid `CODEX ↔ CURSOR ↔ CLAUDE` changes must not produce a stop-then-go head hitch or one-frame limb ownership swap.

The state × provider regression matrix covers all 24 combinations of:

- `idle`, `observing`, `processing`, `warning`, `success`, `offline`;
- `center`, `codex`, `claude`, `cursor`.

## Performance baseline correction

The old triangle budget predated the articulated upper-body renderer and was too low for the real stable scene.

Expected full stable animated stack is approximately:

```text
DRAW CALLS   8
TRIANGLES    3852
GEOMETRIES   4
TEXTURES      8
```

These are expected scene counts, not strict per-frame invariants. Optional planes can lower the observed values.

Soft stable budget:

```text
DRAW CALLS  <= 12
TRIANGLES   <= 4400
GEOMETRIES  <= 12
TEXTURES    <= 12
RENDER MS   <= 14 ms
```

Enhanced budget:

```text
DRAW CALLS  <= 14
TRIANGLES   <= 5200
GEOMETRIES  <= 14
TEXTURES    <= 14
RENDER MS   <= 18 ms
```

`renderMs` is machine-dependent. A single spike is not a failure: the runtime guard requires 5 consecutive violating samples before reporting `WARNING`, and one healthy sample clears the streak. Performance telemetry never auto-disables motion or degrades visual fidelity.

## Persistent QA controls

The existing NYX test controls remain a supported hidden diagnostic surface. They are shown only when the Settings test-controls toggle is enabled.

Controls:

```text
STATE
AUTO | IDLE | OBSERVE | PROCESS | WARNING | SUCCESS | OFFLINE

ATTENTION
AUTO | CENTER | CODEX | CLAUDE | CURSOR

MOTION
BREATH | FOREARMS | UPPER BODY | HEAD
```

0.25 adds a read-only diagnostic strip:

```text
LIFE    renderer lifecycle
PERF    sustained performance status
DRAW    current draw calls
TRI     current triangles
RENDER  current render time
ATTN    resolved attention target
```

The strip consumes existing dataset telemetry with `MutationObserver`. It is mounted only while NYX test controls are visible, so normal production UI gets no diagnostic observer/polling overhead.

## v1 acceptance gate

NYX articulated 2.5D v1 is considered production-accepted when local QA confirms:

1. breathing remains clearly visible at 2× and stays phase-continuous across state/provider changes;
2. state changes never remount or replace NYX with the `CY` loading fallback;
3. forearms do not leave source ghosts, duplicate hands or detached elbow seams;
4. shoulder caps visibly participate without dragging the central chest;
5. torso weight shift remains restrained and lower body stays stable;
6. OBSERVE / PROCESS use provider-side semantic operation hand;
7. WARNING stays bilateral;
8. SUCCESS remains compact and mirrors only where intended;
9. rapid attention retargeting does not visibly snap the head or swap limbs in one frame;
10. diagnostics normally report `LIFE=ANIMATED`; sustained `PERF=WARNING` is investigated using the displayed DRAW / TRI / RENDER values;
11. reduced-motion, hidden/offscreen suspension and resume behavior remain intact;
12. `bun run check` passes locally.

## QA

Run:

```bash
git pull
bun run check
bun run tauri dev
```

Enable NYX test controls and hold:

```text
STATE       PROCESS
BREATH      2.00×
FOREARMS    1.00×
UPPER BODY  1.00×
HEAD        1.00×
```

Rapidly switch:

```text
CODEX → CURSOR → CLAUDE → CURSOR → CENTER
```

Then run the semantic sequence:

```text
IDLE → OBSERVE → PROCESS → WARNING → SUCCESS → IDLE
```

If `PERF` becomes `WARNING`, record the diagnostic strip values rather than guessing which renderer channel caused it.

## After v1

Once this checkpoint passes local acceptance, further NYX work should be optional/additive rather than foundational. Blink remains deferred. Any new joint, larger turn or hidden-surface reconstruction requires approved source-backed art and must not regress this baseline.
