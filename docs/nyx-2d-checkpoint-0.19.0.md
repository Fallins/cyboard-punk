# NYX 2D Checkpoint — 0.19.0

Status: **ARTICULATED 2.5D V1**

## Why this checkpoint exists

The earlier semantic-state experiment used whole-operator CSS translate / scale / rotate transforms. Real-device review showed that those motions read as a sprite bouncing rather than a character performing an action. That approach is retired from the production runtime and its implementation files were removed.

0.19.0 changes semantic state motion to a source-derived articulated rig while keeping the approved NYX identity and canonical master intact.

## Source policy

- Canonical visible source remains `assets/operator/nyx/source/master.webp`.
- No generative redraw, face replacement, costume redesign, or synthetic limb artwork is introduced.
- Arm layers are cropped from the canonical master at runtime.
- The body composite removes the original down-arm pixels and performs only narrow source-derived hidden-area reconstruction around the shoulder/body overlap.
- Blink remains blocked by the facial overlay asset gate.

## Runtime layer model

```text
NYX 2D
├─ weighted body / torso mesh
│  ├─ breathing
│  └─ restrained torso yaw / lean
├─ head partition
│  ├─ anchored head posture
│  ├─ gaze
│  └─ hair follow-through
├─ viewer-left arm
│  ├─ shoulder pivot / upper arm
│  └─ elbow pivot / forearm + hand
├─ viewer-right arm
│  ├─ shoulder pivot / upper arm
│  └─ elbow pivot / forearm + hand
└─ emissive / core effects
```

Arm motion uses hierarchical Three.js groups so elbow rotation follows the shoulder naturally. It is not implemented by translating the complete NYX canvas.

## State pose contract

### IDLE

- Both arms remain in the canonical relaxed down pose.
- User-approved torso breathing is **2.0×**.
- Existing head / gaze / hair life motion continues.

### OBSERVING

- Viewer-right arm raises and folds inward to an inspection pose.
- Torso makes a restrained turn toward that side.
- The held state must remain visibly different from IDLE after the transition finishes.

### PROCESSING

- Viewer-right elbow opens away from the body.
- Forearm folds sharply up and across the torso.
- The hand must finish around the chest / core region, reading like operation of a holographic console.
- Acceptance gate: this must visibly read as **a hand being raised**, not a 1–4 px whole-character shift.

### WARNING

- Both upper arms open.
- Both forearms fold inward/up into a defensive brace.
- The silhouette must be materially different from PROCESSING and IDLE.
- No whole-body shake loop.

### SUCCESS

- Viewer-left arm folds inward and the hand approaches the diamond core / chest.
- Viewer-right arm remains relaxed so SUCCESS cannot be confused with WARNING.
- No bounce acknowledgement.

### OFFLINE

- Returns to canonical neutral arm pose.
- Continuous life motion is suspended according to the existing lifecycle contract.

## Transition contract

State changes interpolate from the current joint pose to the next target instead of snapping:

- WARNING: 420 ms
- SUCCESS: 520 ms
- OBSERVING: 620 ms
- PROCESSING: 680 ms
- IDLE / OFFLINE return: 520 ms

The renderer's motion clock is not restarted for ordinary live-state transitions.

## Calibration controls

When **Settings → NYX test controls** is enabled, the simulator exposes:

```text
BREATH  0.00× – 2.50×
ARMS    0.00× – 1.50×
TORSO   0.00× – 1.50×
HEAD    0.00× – 3.00×
```

Default production and test baseline:

```text
BREATH  2.00×
ARMS    1.00×
TORSO   1.00×
HEAD    1.00×
```

These calibration values remain in memory only and do not persist as normal application settings.

## Retired motion path

The following production concepts are removed:

- `nyx2dGesture.ts`
- `nyx2dStatePose.ts`
- `VITE_NYX_2D_GESTURES` production behavior
- `operator:preview:gestures-off`
- whole-sprite entry keyframes (`nyx-entry-*`)
- `data-nyx-gesture-scale`
- `data-nyx-stance-scale`

The release validator prevents these retired files/tokens from silently returning.

## Performance budget

Articulation intentionally adds four small arm segment planes and source-derived textures. Stable soft diagnostics are therefore updated to:

- draw calls: <= 12
- triangles: <= 2400
- geometries: <= 12
- textures: <= 12
- render time: <= 14 ms

These are telemetry targets only; the runtime never disables articulation automatically because of a slow sample.

## Morning QA

Run:

```bash
git pull
bun run check
bun run tauri dev
```

Enable **Settings → NYX test controls** and inspect, in order:

```text
IDLE → OBSERVE → PROCESS → WARNING → SUCCESS → OFFLINE
```

Primary visual checks:

1. PROCESS visibly raises a forearm/hand to the chest area.
2. WARNING visibly raises both forearms.
3. SUCCESS uses the opposite single arm and does not bounce the full character.
4. OBSERVE has a smaller one-arm inspection pose plus a restrained torso turn.
5. Arm cut edges, shoulder reconstruction, elbows, and hands do not show unacceptable holes or duplicate source pixels.
6. Returning to IDLE restores the canonical relaxed silhouette.
7. 2× breathing remains visually acceptable while an articulated state is held.
8. Hidden/offscreen/reduced-motion lifecycle behavior remains unchanged.

Any seam or pivot artifact found in this pass should be fixed by source-mask / pivot / angle tuning, not by returning to whole-sprite semantic motion.
