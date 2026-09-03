# NYX 2D Checkpoint 0.20.0 — Forearm Motion Final Polish

## Scope

0.20.0 does not add new anatomy layers. It finalizes the current source-safe elbow-down semantic motion before any shoulder / upper-arm / torso expansion.

Stable visual channels remain:

- breathing at user-approved `2.00x`
- anchored head motion
- hair follow-through
- provider-directed gaze
- emissive/core response
- source-alpha forearm articulation
- persistent renderer mount across provider refreshes and live state changes

Blink remains blocked.

## Semantic pose language

The forearm poses were reduced from the more extreme 0.19.x angles and given clearer hierarchy:

| State | Left elbow | Right elbow | Intent |
| --- | ---: | ---: | --- |
| `idle` | 0° | 0° | canonical neutral |
| `observing` | 0° | -56° | restrained check / attention pose |
| `processing` | 0° | -98° | deeper virtual-console interaction |
| `warning` | +76° | -84° | asymmetric two-forearm brace |
| `success` | +68° | 0° | compact opposite-hand acknowledgement |
| `offline` | 0° | 0° | canonical neutral/static |

Shoulder rotation and torso semantic articulation remain zero. They must not be reintroduced until source-backed layers exist.

## Transition timing

Transition duration is now based on the actual largest elbow angular travel between the current pose and target pose.

Each target state supplies a bounded human-readable speed profile:

- observing: ~92°/s, 760–1050ms
- processing: ~88°/s, 820–1220ms
- warning: ~104°/s, 800–1080ms
- success: ~90°/s, 780–1050ms
- return to idle/offline: ~96°/s, 820–1120ms

This means a small `OBSERVE -> PROCESS` adjustment no longer takes the same time as a large `WARNING -> PROCESS` cross-body change.

Bilateral motion retains only a small 4.5% right-side delay so WARNING does not read as two perfectly synchronized servos.

All transitions use one continuous smoother-step curve. There is no secondary settle segment or overshoot.

## Preserved fixes

0.20.0 preserves the 0.19.x correctness fixes:

1. forearm segmentation uses canonical source alpha intersected with the measured forearm corridor;
2. the same generated mask clears the body and extracts the movable forearm;
3. there is no hand-authored erase polygon or generated body repair;
4. live-state changes share one continuous breathing phase;
5. `OperatorStage` stays mounted and is not replaced by a Suspense loading fallback during refresh/state changes.

## QA gate

Run:

```bash
bun run check
bun run tauri dev
```

Enable NYX test controls and inspect these sequences, pausing briefly at each state:

```text
IDLE -> OBSERVE -> PROCESS -> WARNING -> SUCCESS -> IDLE
```

Also test direct cross-state changes:

```text
WARNING -> PROCESS
PROCESS -> OBSERVE
SUCCESS -> WARNING
```

Acceptance criteria:

1. OBSERVE reads as visibly lighter than PROCESS.
2. PROCESS reads as a deliberate single-hand interaction, not an extreme fold.
3. WARNING clearly uses both forearms but does not look mechanically symmetrical.
4. SUCCESS is smaller and calmer than WARNING and uses the opposite forearm.
5. Large pose changes take visibly longer than small pose changes.
6. No forearm/hand ghost pixels reappear.
7. Breathing remains continuous through live-state changes.
8. NYX never disappears into the CY loading fallback during repeated state changes or provider refresh.
