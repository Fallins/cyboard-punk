# Shion / 紫苑 NYX VRM workbench

This is an opt-in multi-page Vite workbench for the reviewed Shion / 紫苑 source stored at
`public/experiments/nyx-vroid/shion.vrm`.

It is deliberately separate from the production application and does not import or replace
`OperatorStage` and `NyxVrmRuntime`.

The workbench resolves its model through the production character catalog. The current default is
`shion-vroid-2-14-v1` (`紫苑 · VRoid Studio 2.14` in the selector); a future reviewed character can be selected explicitly with
`/experiments/nyx-vroid/?character=<character-id>`. See
[`docs/experiments/vrm-character-contract.md`](../../docs/experiments/vrm-character-contract.md)
before adding a character entry.

Run it with:

```bash
bun run nyx:experiment
```

The workbench loads Shion through `@pixiv/three-vrm` and eleven VRMA files through
`@pixiv/three-vrm-animation`. The seven VRoid Project motions are copied unchanged from the
user's `VRMA_MotionPack.zip` (SHA-256
`64d6e87d12ad0e43daaf4f261f74b05322329b9f18b9b7ab4da6f9611b995af8`) into
`public/experiments/nyx-vroid/vrma/`.

The four files in `experiments/nyx-vroid/local-assets/wonderful/` are copied unchanged from the
user's `ワンダフルなVRMAセット.zip` (SHA-256
`546032815ff89aeafad47d8331a01e9c28d8d2c319fabdcee26e3a67ac85b26f`). The included Japanese
readme prohibits unmodified redistribution and paid redistribution of modified files, along with
other use restrictions. The readme does not identify an author or grant a publication license, so
these are local experimental assets only. That directory is gitignored and outside Vite's public
asset directory: do not commit, distribute, or bundle them without a separate rights review.

It also has an opt-in ambient breathing layer derived from the `Spine Front-Back` curve in
`Sig_Add_Breath.anim` from the user-supplied `Sig_Breath_Mod_v3.0.0.zip`. The source is a Unity
humanoid animation rather than a VRMA file, so this preview preserves its 4-second timing and
primary curve as a documented experimental retarget. It is not presented as a byte-identical
VRMA conversion, and it excludes every VRC, OSC, heart-rate, prefab, and installer component.

When the workbench opens without a selected motion, its rest state is Shion's standard
`relaxed` expression at 70% plus the Sig Breath layer (unless `prefers-reduced-motion` is set).
Formal Settings exposes only the production allowlisted event map, random controls, and scale. In a local Tauri
development build, the workbench can inspect all registered preview motions. Selecting a motion reloads only this
disposable preview window with the requested clip; it does not alter the published NYX runtime or create automatic
provider-to-motion mapping.

The pack's required attribution is shown in the preview and must accompany any future
commercial use: `Animation credits to pixiv Inc.'s VRoid Project`. Its terms prohibit
redistributing the motions (including modified versions) in an extractable form. Do not move
these files into a production asset path or publish them independently without a separate
license review.

None of the eleven inspected VRMA files contains expression tracks. The workbench therefore uses
Shion's source-defined VRM expression manager for a small, documented motion-to-face cue
when a motion has one; it never guesses a face for an uncued action. If a future VRMA contains
expression tracks, those source tracks take precedence over the preview cue. Playback is explicit
only, honors `prefers-reduced-motion`, and stops its animation loop while the document is hidden.
This experiment does not change production NYX or create automatic state-to-motion mapping.
