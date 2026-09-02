# NYX 2D Checkpoint 0.15.0 — Facial Overlay Asset Gate

## Purpose

Protect NYX facial identity before any blink or future facial micro-expression layer can enter the renderer.

This checkpoint intentionally adds **no new visible facial animation**.

## Current production stack

Stable:

- canonical NYX 2D renderer
- anchored head posture
- torso breathing
- hair follow-through
- provider-directed gaze
- emissive/core response
- live state continuity
- performance telemetry

Quarantined:

- blink
- any synthetic eyelid/closed-eye reconstruction

## Facial gate source of truth

`src/ui/nyx2dFaceOverlayGate.json`

Current blink gate:

- `status: blocked`
- `implementation: none`
- `approvedAssets: []`

`VITE_NYX_2D_BLINK=1` therefore remains a no-op.

Runtime enablement requires all three conditions simultaneously:

1. env feature request is enabled;
2. facial gate status is `ready` with at least one approved asset;
3. facial implementation is explicitly `source-overlay`.

The old synthetic blink shader is not a valid implementation path.

## Build validation

Run:

```bash
bun run operator:validate:face
```

It is also part of:

```bash
bun run check
```

A future `ready` gate must provide full-master-size `941x1672` alpha overlays with SHA-256 checksums, canonical eye landmarks, valid repository paths, matching decoded dimensions, and real alpha channels.

## Graduation rule

Do not change `blink.status` to `ready` until a source-derived closed-eye/eyelid overlay has passed the requirements in:

`docs/nyx-2d-face-overlay-spec.md`

Forbidden approaches remain:

- sclera reconstruction
- black eyelid fill
- guessed skin/eye pixels
- generative redesign of NYX's face
- enabling the quarantined synthetic shader merely because an env flag is present

## QA note

There should be no visual difference between 0.14.0 and 0.15.0 in normal runtime. This checkpoint is an asset-safety and implementation-safety boundary for the next facial animation phase.
