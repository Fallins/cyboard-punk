# Performance Budgets

CYBOARD lives in the menu bar, so idle efficiency is a product feature.

## Phase 1 budgets
- idle app CPU average: < 1% on a modern Apple Silicon Mac after warm-up
- hidden background CPU target: < 0.3% average outside refresh windows
- idle memory target: < 120 MB RSS with the dashboard/operator inactive
- compact popover interactive: < 150 ms from click when cached data exists
- cached dashboard first meaningful render: < 300 ms
- provider refresh must never block the UI thread
- network requests: only provider-required calls; no project-owned telemetry by default
- bounded caches and history; no unbounded arrays or full-history reparsing on every refresh

## Provider and token-telemetry bounds
Provider refresh work runs behind the native blocking boundary and must remain bounded independently per source.

### Quota/history
- quota history: at most 2,160 normalized samples per provider
- provider network calls use explicit connect/request timeouts
- concurrent provider refresh work is coalesced through the native refresh gate
- a provider failure must not force unrelated providers to re-run synchronously in the frontend

### Codex token activity
- newest versioned `state_*.sqlite` only
- read-only `/usr/bin/sqlite3`
- at most 200 recent token-bearing threads
- query only timestamp, token total and `cwd` required for optional project basename
- no prompt/title/preview/history-body columns

### Claude Code token activity
- scan only `.jsonl` files below `~/.claude/projects`
- at most 24 most recently modified transcript files
- at most final 1 MiB per selected file
- at most 200 normalized recent request samples
- raw transcript content is discarded after safe usage metadata is selected

### Cursor token activity
- read existing desktop auth only from the newest Cursor-family `state.vscdb` through read-only SQLite
- dashboard event query window: most recent 7 days
- pagination: at most 2 pages × 500 events
- response body: at most 4 MiB per page before JSON deserialization
- request/connect timeouts are mandatory
- a failed page invalidates that refresh's optional Cursor usage slice rather than publishing a partial requested page set

## NYX VRM/VRMA budgets
NYX production uses the reviewed VRM 1.0 character catalog and published VRMA catalog (attributed VRoid Project
motions). The candidate is rendered without a hidden quality governor: model geometry, authored materials,
textures, morphs, and spring-bone-capable VRM runtime support are not downgraded merely to satisfy
a counter.

- hidden document/window: zero intentional animation frames
- reduced motion: static relaxed 70% rest pose, with no Sig Breath, VRMA, or random playback
- visible ambient target: <= 30 FPS; a VRMA plays only while it is active
- model load is once per mounted production runtime; provider-state, attention, mapping, random-setting, outfit,
  and scale changes must not reload it. Switching to a different reviewed character is the explicit exception.
- random scheduling is timer-based, paused while hidden, and does not create a render loop by itself
- the optional transparent `nyx-presence` companion is a separate mounted runtime; it receives the same reviewed
  settings and must stop intentional animation frames when its own document becomes hidden or it is closed
- performance instrumentation is diagnostic. It may suspend hidden work, but it must not silently
  disable motion or lower visual fidelity merely to make counters green.

The current candidate's observed 180 joints, 3 skinned meshes, 57 morphs, and 45,813 triangles are
an intake baseline rather than a reason to substitute a lower-quality model. Frame-time work should
be profiled on the target device with the full source intact.

## NYX runtime behavior
The production path is:

```text
OperatorStage
  -> NyxVrmRuntime
      -> reviewed catalog VRM model
      -> allowlisted VRMA action loader
      -> Sig Breath rest-pose controller
```

The runtime stays persistently mounted across semantic-state, provider-attention, action mapping,
random-setting, outfit selection, and scale changes. Retargeting must not reconstruct the renderer, reload the
model, restart the breathing clock, or recreate provider clients. VRM/WebGL failure uses the lightweight
non-character CYBOARD status surface while provider monitoring continues.

Motion work is explicit and cancellable:
- final frame of `Model pose` plus `relaxed` 70% face and Sig Breath ambient rest pose
- a state transition may play one mapped, allowlisted VRMA exactly once
- a source VRMA expression track takes precedence over a curated standard-VRM face cue
- while a VRMA is loading, normalized-human-bone updates remain off; the captured rest pose stays visible until
  the new clip has been created and its first frame applied, preventing a bind/T-pose flash
- random actions use only published catalog motions, never repeat the prior random action when an
  alternative exists, and wait for an active event action to finish
- `prefers-reduced-motion` and hidden documents suspend continuous/random playback and retain a
  static relaxed rest pose

## Local diagnostics
The NYX WebGL host exposes development-only local `data-*` diagnostics such as runtime state,
ambient mode, render timing, and renderer failure. These values remain inside the local DOM and are
not sent to telemetry.

Performance guardrails must be checked against the current release validator and VRM lifecycle tests
rather than a quality-reducing governor.

## Techniques
- normalize/aggregate provider data in Rust before IPC
- keep provider and local-usage collectors bounded and inside the blocking native refresh path
- read file tails rather than full Claude transcript histories
- use read-only, column-minimal SQLite queries for Codex/Cursor state
- per-provider cache with freshness/source metadata where applicable
- coalesced refresh tasks and provider backoff/cooldown behavior
- Solid fine-grained signals instead of broad object churn
- charts and token summaries receive bounded normalized series
- CSS transforms/opacity for HUD animation; avoid layout-triggering animation
- provider-linked dashboard panels remain DOM/CSS rather than WebGL textures
- hidden windows cancel intentional animation frames

## Instrumentation
Development builds expose or retain local timing surfaces for app boot, popover open, provider refresh, file scan, IPC payload size, chart render, NYX runtime state and renderer frame time. Performance regressions above 20% should block release unless documented.

Before a tagged release, run the local macOS validation and real-device performance smoke described in [`testing.md`](./testing.md). A check that was not run must be recorded as unverified rather than assumed to pass.
