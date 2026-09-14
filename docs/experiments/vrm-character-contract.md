# NYX VRM character contract

## Production boundary

`src/experiments/vrmCharacterRuntime.ts` defines the typed model, humanoid-capability, expression,
and motion-pack contract. `src/experiments/nyxVroidExperiment.ts` is the reviewed NYX catalog.
Despite the historical directory name, this catalog now backs the production character runtime.

```text
approved model source + SHA-256
    + VRM 0.x / 1.0 humanoid capability gate
    + motion-pack provenance / availability
    + standard-VRM face cues
              |
              v
OperatorStage -> NyxVrmRuntime
              |
              +-- Character workbench allowlisted event map
              +-- optional random scheduler
              +-- local Tauri preview for inspection
```

The production model is `7699905036472295605.glb`: VRM 1.0, 180 joints, 3 skinned meshes, 57 morphs, a humanoid
rig, and no embedded animation clips. Production uses the unchanged inspected source and does not introduce a
reduced-quality derivative. If VRM/WebGL is unavailable, the UI presents a lightweight no-character CYBOARD state
while provider monitoring continues.

`NyxVrmRuntime` is mounted once for the active NYX operator. Semantic state, provider attention,
event mappings, random settings, outfit selection, and character scale are runtime updates, not reasons to
recreate the renderer, reload the model, or restart the Sig Breath clock. Selecting another reviewed character is
the explicit remount boundary.

## Motion catalog and licensing

The catalog must name every source asset, immutable SHA-256, attribution, and availability.

- The seven VRoid Project motions are `availability: 'production'`. Retain the required attribution:
  `Animation credits to pixiv Inc.'s VRoid Project`.
- CYBOARD does not ship project-authored motions in the production catalog. The allowlist contains
  only the approved VRoid Project motion pack.
- The four Wonderful motions are `availability: 'local-development'`. They remain gitignored local
  preview inputs, must not be copied into `public/`, committed, bundled, offered in Settings, or
  used as a production requirement.
- Settings store only a known catalog ID or `rest`; they never accept a file path, URL, free-form
  input, or an unlisted local asset.

The Character workbench is the only UI for character configuration. It gives the user a local orbit/zoom preview,
then persists reviewed character, outfit, event-map, random, and scale choices for the primary stage. A workbench
action preview keeps humanoid auto-update disabled until the VRMA has loaded and a first frame has been applied, so
the captured rest pose cannot flash to the normalized bind/T-pose during I/O.

Outfits are catalogued baked variations. A texture file may be shown as a compatibility note, but cannot become a
selectable runtime outfit unless its source mesh and UV mapping have been verified. The Techwear crop set is a
VRoid Studio Hoodie/pants texture input and currently requires the original `.vroid` project; neither reviewed GLB
exposes those source slots.

The six normalized runtime events are `idle`, `observing`, `processing`, `warning`, `success`, and
`offline`. Each maps to either `rest` (`relaxed` at 70% plus Sig Breath) or a published VRMA.
An unchanged event never replays its action solely because providers refreshed. A source VRMA's
expression tracks take precedence; the curated standard-VRM face cue is applied only if the source
has no expression track.

The default skeleton is captured from the final frame of the approved `Model pose` VRMA. The runtime
then layers the `relaxed` expression at 70% and Sig Breath over that source pose; it does not use a
separately authored A-pose replacement.

Random actions are opt-in, use only published IDs, accept 30 / 60 / 120 / 300 seconds after
sanitization, avoid repeating the immediately prior random action when another action exists, and
wait for an event action to finish. Hidden documents and `prefers-reduced-motion` pause scheduling;
reduced motion restores a static relaxed rest pose.

## Adding a compatible character or motion pack

1. Inspect the original asset and record path, immutable SHA-256, licensing, VRM version, humanoid
   capability, facing direction, and visual review result. Do not replace an existing binary.
2. Mark each motion pack either `production` (distribution rights confirmed) or `local-development`.
   The latter is preview-only and cannot appear in any production selector.
3. Add the character manifest and tests for valid, partial, malformed, stale, provider-changed, and
   unavailable motion metadata as applicable. Keep raw provider payloads out of the catalog.
4. Verify browser and local Tauri playback with the full model: relaxed rest, Sig Breath, no bind/T-pose flash
   while an action loads, an action with source expressions (if supplied), curated-cue fallback, hidden pause,
   reduced motion, scale, workbench persistence, and failure UI.

Compatible VRMs may reuse loader, standard expression, camera framing, VRMA, random-scheduler, and
visibility mechanics. They still require visual review for rest pose, scale, facing, secondary
motion, licensing, and each supplied action. NYX's `mouthLarge` morph remains source-specific and
is not a generic catalog cue.

The main stage camera lock is persisted as an interaction preference only; it disables Orbit controls and reset
without changing model, pose, or animation state. The local macOS `nyx-presence` companion opens a transparent,
always-on-top app window with the same reviewed character and normalized action settings. It contains no dashboard
or provider data and is not a general-purpose arbitrary-model or desktop-layer renderer.
