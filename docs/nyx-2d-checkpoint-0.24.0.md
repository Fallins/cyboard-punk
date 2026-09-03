# NYX 2D Checkpoint — 0.24.0

Status: **MOTION REGRESSION / RELEASE HARDENING BASELINE**

## Scope

0.24.0 does not add another joint or redraw NYX. It freezes the current articulated 2.5D operator as a safer production baseline before any new visual capability is introduced.

Production NYX remains canonical-source based:

- canonical 941×1672 `master.webp` remains the only displayed character RGB source;
- breathing remains user-approved at `2.00×`;
- source-alpha forearms remain the only detached limb sprites;
- upper arms / shoulders / torso remain weighted deformation of the canonical body mesh;
- blink remains quarantined and is not part of this checkpoint.

## Attention continuity fix

The 0.23 finite attention ease could produce a very small perceived pause when the provider target was changed again while the head was still moving.

0.24 replaces that restartable attention transition with persistent damping:

- head attention response: `280 ms` to approximately 95% response;
- upper-body / arm provider-side response: `720 ms` to approximately 95% response;
- provider retargeting preserves the current filtered position;
- changing provider attention does **not** call `syncRuntime()`;
- breathing clock therefore remains continuous during provider changes.

Head and body intentionally use different response speeds. The head acknowledges the new source first, while the heavier shoulder / torso / arm chain follows more slowly.

## Provider-side articulation

`OBSERVE` and `PROCESS` keep semantic hand ownership aligned with the provider side:

- Codex / Claude: dashboard-left → left operation hand;
- Cursor: dashboard-right → right operation hand;
- Center: existing center-facing baseline.

`WARNING` remains bilateral and only biases emphasis toward the provider side.

`SUCCESS` stays compact and mirrors to the right hand only for a right-side provider target.

Runtime provider-side motion now uses a continuous `-1..1` side mix instead of swapping an enum pose in one frame.

## Regression matrix

`src/ui/nyx2dMotionMatrix.test.ts` locks the complete semantic matrix:

- 6 runtime states;
- 4 attention targets;
- 24 state × provider combinations.

The matrix verifies:

- all pose values remain finite;
- shoulder / torso motion stays inside source-guided calibration limits;
- idle and offline remain neutral for every provider;
- OBSERVE / PROCESS use the provider-side operation hand;
- WARNING never drops either arm;
- SUCCESS stays compact and mirrors only when appropriate;
- head attention and torso direction agree with provider side.

## Existing production contracts retained

- NYX is 2D-only; retired NYX 3D assets / runtime switches remain forbidden.
- OperatorStage stays statically mounted; provider refresh must not replace NYX with a loading fallback.
- Live state changes do not restart the breathing clock.
- Body mesh remains `24×40` segments (`1025` vertices / `1920` body triangles).
- Shoulder-cap deformation remains source-guided and bounded.
- Spine-weighted torso shift retains lower-body counter-shift.
- Exact elbow anchors are published from the deformed body frame.
- Forearm extraction and body erase continue to share the source-alpha mask contract.
- Performance budgets remain soft diagnostics only; no automatic visual degradation is allowed.

## QA

Run:

```bash
git pull
bun run check
bun run tauri dev
```

With NYX test controls enabled, use:

```text
STATE = PROCESS
BREATH = 2.00×
FOREARMS = 1.00×
UPPER BODY = 1.00×
HEAD = 1.00×
```

Then change attention repeatedly:

```text
CODEX → CURSOR → CLAUDE → CURSOR → CENTER
```

Acceptance:

1. breathing phase never resets;
2. head direction changes without a visible positional snap;
3. rapid retargeting does not produce a tiny stop-then-go restart;
4. arm / torso ownership changes continuously rather than swapping in one frame;
5. no CY fallback appears;
6. no forearm ghosting / duplicate limbs return;
7. shoulder and elbow seams remain connected throughout the change.

## Next

After 0.24 passes local `bun run check` and visual QA, further work should be additive rather than foundational. Candidate next work is production UI/diagnostic cleanup and final performance/visual acceptance; blink remains deferred until source-derived eyelid data exists.
