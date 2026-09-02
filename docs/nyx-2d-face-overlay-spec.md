# NYX 2D Facial Overlay Asset Spec

Status: **asset-gated / blink blocked**

This spec protects NYX facial identity. Facial animation must never be reconstructed from guessed skin, sclera, black fills, procedural eyelids, or generative redesigns.

## Canonical coordinate space

All approved facial overlays must target the locked NYX master:

- size: `941 x 1672`
- SHA-256: `6ef57008ba843a57b614d148f4055c9fdf9235f303117098ac3e13387041f263`
- policy: `approved-source-only-no-synthetic-reconstruction`

A facial overlay is stored as a full-master-size transparent image even when only a small eye region contains pixels. This removes crop-offset ambiguity at runtime.

## Blink graduation requirements

Blink remains blocked until every item below is satisfied:

1. A source-derived closed-eye or eyelid image exists and preserves the approved NYX face.
2. The overlay is `941 x 1672` with a real alpha channel.
3. The overlay has a recorded SHA-256 checksum.
4. Left and right eye alignment landmarks are recorded in canonical master pixel coordinates.
5. Neutral/open state changes zero facial pixels; the overlay is absent/transparent at blink amount `0`.
6. No sclera reconstruction, synthetic black lid fill, skin guessing, or generative face redesign is used.
7. Visual QA shows no black-eye patch, double eye, iris duplication, face drift, seam, or identity change.
8. Runtime remains lifecycle-safe: offline/reduced-motion/hidden states do not animate blink.
9. Performance remains inside the current NYX 2D stable budget.

## Gate manifest

Source of truth:

`src/ui/nyx2dFaceOverlayGate.json`

`blink.status` may only become `ready` after at least one approved asset is listed. Each approved asset record must provide:

```json
{
  "path": "assets/operator/nyx/face/<asset>",
  "sha256": "<64 hex chars>",
  "width": 941,
  "height": 1672,
  "leftEyePx": [0, 0],
  "rightEyePx": [0, 0]
}
```

The placeholder landmark values above are schema examples only; real approved coordinates must be measured from the canonical master.

## Validation

Run:

```bash
bun run operator:validate:face
```

`bun run check` also runs this validator automatically.

When the gate is `blocked`, `VITE_NYX_2D_BLINK=1` must remain a no-op. When the gate is eventually `ready`, the existing blink cadence logic may be connected only to the approved source-derived overlay; the quarantined synthetic eyelid shader is not an acceptable implementation path.
