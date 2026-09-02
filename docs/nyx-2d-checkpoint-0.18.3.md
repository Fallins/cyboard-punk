# NYX 2D checkpoint 0.18.3 — Corrective motion reset

## Decision

The previous state-specific `gesture` and `stance` channels are **not accepted as semantic 2.5D character motion**.

They only applied whole-operator translation / rotation / scale and produced bounce-like reactions rather than articulated character actions. They remain available only as diagnostic history and are disabled in production.

## Production motion baseline

```text
breath  = 2.00x  (user-approved)
gesture = 0.00x  (retired whole-sprite semantic motion)
stance  = 0.00x  (retired whole-sprite semantic motion)
head    = 1.00x  (ambient anchored life motion only)
```

Hair follow-through, provider gaze, emissive/core animation and lifecycle controls remain independent stable channels. Blink stays asset-gated / quarantined.

## What counts as the next 2.5D milestone

The next semantic motion implementation must move **character anatomy**, not the complete sprite.

First acceptance target:

- `PROCESSING`: at least one forearm + hand visibly lifts around a real elbow pivot.
- The shoulder / upper arm remains anatomically connected.
- The base silhouette must not show a duplicate or ghost arm.
- Returning to `IDLE` restores the canonical master pose without a visible seam.

Follow-up targets:

- `WARNING`: bilateral forearm / shoulder brace.
- `SUCCESS`: one-arm acknowledgement rather than whole-body bounce.
- `OBSERVING`: shoulder / upper-torso orientation plus gaze toward attention target.
- Limited torso yaw/parallax may be added only after limb articulation is visually accepted.

## Asset policy

NYX remains `series-locked-no-redesign`.

Approved existing references have been recovered from the user's Library, including the character design sheet, orthographic multi-view, close portrait and canonical hero art. These may be used for source-derived layer planning. Do not generatively redesign or rerender NYX.

## Explicit non-goals

- no whole-sprite bounce as a state gesture
- no fake full-body rotation from a flat card
- no synthetic blink
- no 3D NYX fallback
