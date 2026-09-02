# NYX 2D Checkpoint 0.13.0 — Hair Graduation

## Status

Hair follow-through has graduated from the enhanced preview into the stable NYX 2D runtime.

Stable runtime now includes:

- canonical NYX 2D renderer
- anchored head posture
- asymmetric torso breathing
- state-driven emissive/core response
- live-state transition continuity
- face-safe outer-fringe hair follow-through
- sustained performance telemetry

Enhanced currently adds only provider-directed gaze.

Synthetic blink remains quarantined.

## Hair visual contract

Hair is secondary motion only. It does not run an independent idle sine wave.

The moving overlay is restricted to the approved face-safe outer hair zones and purple-hair confidence mask. Protected face pixels remain excluded.

The approved master remains the base image. To reduce duplicate-hair ghosting, the follow-through overlay is fully transparent around neutral and fades in only while the hair spring has a visible angular separation from the rigid head layer.

Current overlay rules:

- neutral/deadband opacity: `0`
- maximum accent opacity: `0.30`
- motion deadband: about `0.08deg`
- maximum spring angle remains constrained by the declared hair envelope
- no autonomous hair drift
- reduced-motion, hidden and offline states stop/reset hair motion

## Runtime defaults

Normal production launch:

```bash
bun run tauri dev
```

Hair follow-through is enabled by default.

Hair-only rollback / A-B:

```bash
VITE_NYX_2D_HAIR_MOTION=0 bun run tauri dev
```

Enhanced gaze preview:

```bash
bun run operator:preview:2d
```

The enhanced launcher no longer needs to enable hair; it now adds gaze only.

## Performance

Hair adds one masked overlay layer but remains inside the existing stable soft budget. Performance telemetry remains diagnostic only and must not automatically reduce NYX visual fidelity.

Stable targets remain:

- draw calls <= 8
- triangles <= 2200
- geometries <= 8
- textures <= 8
- render <= 12ms

## Regression requirements

- hair is enabled when `VITE_NYX_2D_HAIR_MOTION` is unset
- `0`, `false` and `off` explicitly disable hair
- protected face center remains outside the hair mask
- outer silhouette weight is stronger than face-side weight
- overlay opacity is exactly zero at neutral
- overlay opacity stays <= 0.30 at the declared maximum angle
- hair settles toward neutral after head movement stops
- no independent perpetual hair drift may be reintroduced

## Next gate

Gaze is the only remaining enhanced life-motion channel. It must pass visual QA and eye reconstruction safety before graduation into stable. Blink must not be revived without a reliable eyelid/closed-eye source.
