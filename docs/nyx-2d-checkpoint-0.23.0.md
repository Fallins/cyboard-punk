# NYX 2D Checkpoint 0.23.0 — Provider Attention Coordination

## Status

`0.23.0` coordinates NYX's existing production 2.5D channels around the provider that currently owns attention.

No new artwork, generated body surface, shoulder sprite, or facial asset is introduced. Visible RGB remains the canonical NYX master. Blink remains blocked.

## Shared attention contract

Provider attention continues to resolve from real provider state:

1. warning providers have priority, with the most constrained warning selected first;
2. otherwise an active provider owns attention;
3. otherwise attention returns to center.

Dashboard mapping:

- `codex` → left
- `claude` → left
- `cursor` → right
- `center` → neutral

The resolved target is now shared by gaze, head posture, ribcage/weight shift, shoulder support, and semantic arm selection.

## Semantic coordination

### Observing / processing

The operation hand follows the provider side.

- left-side Codex/Claude: left shoulder/forearm engage and torso bias is left;
- right-side Cursor: right shoulder/forearm engage and torso bias is right;
- center: the established center-facing 0.22 pose remains the fallback.

The forearm angles and safety envelopes are unchanged from the approved semantic motion; only the active side is coordinated.

### Warning

WARNING remains bilateral. The provider-facing arm receives a small `1.06x` emphasis while the support arm is reduced to `0.94x`. Ribcage yaw/shift is biased toward the warning provider.

This preserves the brace silhouette without making both arms perfectly symmetrical.

### Success

The established left-side acknowledgement remains the center/default pose. If attention belongs to Cursor, the acknowledgement mirrors to the right side so head/body/hand direction stays coherent.

## Attention transition

Provider changes do **not** restart the WebGL renderer or breathing clock.

A shared attention transition runs for `720ms`:

```text
previous provider target
        ↓
   smoothstep 720ms
        ↓
new provider target
```

The same transition feeds:

- provider-directed head bias;
- articulated arm/shoulder/torso target blending.

Gaze keeps its existing damped eye movement while reading the same `data-attention-target` from `OperatorStage`.

Because attention is not a `Nyx2DWebGL` lifecycle dependency, changing the active provider cannot call `syncRuntime()` or reset the user-approved `2.00x` breathing phase.

## Head safety

Provider-directed head motion uses the existing source-safe head/body collar partition only.

Attention bias is hard-clamped inside the established head envelope:

- horizontal: `±0.004` world units;
- vertical: `±0.0082` world units;
- neck-pivot rotation: `±1.9°`.

No true head yaw or hidden face reconstruction is introduced.

## Diagnostic controls

When **NYX test controls** are enabled, the simulator now exposes a separate attention row:

```text
ATTENTION
AUTO | CENTER | CODEX | CLAUDE | CURSOR
```

This override affects only NYX attention. It does not mutate provider quota/session/state data.

Production remains `AUTO`.

Existing tuning controls remain:

```text
BREATH      2.00x
FOREARMS    1.00x
UPPER BODY  1.00x
HEAD        1.00x
```

## Preserved contracts

0.23 preserves all accepted lower-level fixes:

- user-approved `2.00x` continuous breathing;
- persistent OperatorStage mount with no Suspense loading replacement;
- source-alpha single-mask forearms with no ghost/duplicate limbs;
- source-guided shoulder caps and 24×40 body mesh;
- spine-weighted ribcage motion and lower-torso counter-shift;
- exact breathing/shoulder-aware elbow anchor handoff;
- travel-based semantic arm timing;
- no NYX 3D runtime or assets;
- blink blocked.

## QA

Run:

```bash
bun run check
bun run tauri dev
```

Enable NYX test controls and keep production tuning values.

First set:

```text
STATE = PROCESS
```

Then switch attention, pausing roughly 1–2 seconds at each target:

```text
CODEX → CURSOR → CLAUDE → CENTER
```

Expected behavior:

1. Codex/Claude use the left operation arm and bias head/ribcage left.
2. Cursor uses the right operation arm and biases head/ribcage right.
3. Provider changes transition smoothly; the operation hand must not teleport.
4. Gaze, head, torso and operation hand must agree on direction.
5. CENTER returns to the established center-facing semantic pose.
6. Breathing must remain continuous throughout attention changes.
7. NYX must never disappear into the CY loading fallback.

Then test WARNING:

```text
STATE = WARNING
CODEX → CURSOR
```

Both arms must remain active. Only the provider-facing side should become slightly more dominant.

Finally compare:

```text
UPPER BODY = 1.00x
UPPER BODY = 0.00x
```

This isolates the provider-directed ribcage/shoulder contribution from the forearm-only baseline.

## Acceptance criteria

1. Head, gaze, torso and semantic operation hand point toward the same provider.
2. Codex/Claude and Cursor produce clearly opposite operation-side poses in OBSERVE/PROCESS.
3. Attention changes take approximately the shared 720ms transition instead of snapping.
4. Attention changes do not restart breathing or renderer lifecycle.
5. WARNING remains bilateral and asymmetric.
6. No shoulder/forearm seam, ghost limb, duplicate arm or body hole reappears.
7. Head motion stays inside the existing safe envelope and does not stretch the collar seam.
8. Test attention override remains hidden when NYX test controls are disabled.
9. Production provider data is never mutated by the diagnostic override.
10. Blink remains disabled.
