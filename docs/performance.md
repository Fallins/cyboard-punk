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

## NYX 2D/2.5D budgets
NYX production is 2D-only. There is no production GLB/VRM/3D character budget anymore.

- hidden document/window: zero intentional animation frames
- reduced motion: static state, no continuous decorative loop
- ambient visible target: <= 30 FPS
- device pixel ratio is capped to avoid unnecessary Retina GPU cost
- no continuous physics simulation
- performance monitoring is diagnostic; it must not silently disable motion or reduce visual fidelity merely to make counters green

### Stable scene soft budget
- draw calls: <= 12
- triangles: <= 4,400
- geometries: <= 12
- textures: <= 12
- sustained render time: <= 14 ms

### Enhanced scene soft budget
- draw calls: <= 14
- triangles: <= 5,200
- geometries: <= 14
- textures: <= 14
- sustained render time: <= 18 ms

Render-time limits use sustained violations rather than treating a single spike as failure.

## NYX runtime behavior
The production path is:

```text
OperatorStage
  -> Nyx2DManagedRuntime
  -> Nyx2DWebGL
```

The runtime stays persistently mounted across semantic-state and provider-attention changes. Retargeting must not reconstruct the renderer, flash the lightweight `CY` fallback, restart the breathing clock, or recreate provider clients.

Motion work is intentionally small and source-safe:
- continuous breathing clock
- restrained head/gaze/hair follow-through
- weighted upper-body mesh deformation
- articulated source-alpha forearms
- provider-linked semantic attention
- persistent damping for state/provider retargets

Exact same-frame elbow anchors keep detached forearms joined to the final deformed body frame without extra scene rebuilds.

## Local diagnostics
The NYX WebGL host exposes development-only local `data-*` diagnostics such as runtime state, target FPS/render timing and scene counts. These values remain inside the local DOM and are not sent to telemetry.

Performance guardrails must be checked against the current release validator and NYX diagnostic components rather than the retired 3D quality-governor contract.

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
- provider-linked Operator HUD panels remain DOM/CSS rather than WebGL textures
- hidden windows cancel intentional animation frames

## Instrumentation
Development builds expose or retain local timing surfaces for app boot, popover open, provider refresh, file scan, IPC payload size, chart render, NYX runtime state and renderer frame time. Performance regressions above 20% should block release unless documented.

Before a tagged release, run the local macOS validation and real-device performance smoke described in [`testing.md`](./testing.md). A check that was not run must be recorded as unverified rather than assumed to pass.
