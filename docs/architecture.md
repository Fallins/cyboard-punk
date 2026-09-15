# Architecture

## Stack

- Desktop: Tauri v2
- Frontend: Solid.js + TypeScript + Vite
- Native/backend: Rust
- Tests: Vitest + Testing Library; Rust `cargo test`; macOS smoke workflow

## Boundaries

```text
Provider source (CLI/local state/API)
        ↓
Rust provider adapter
        ↓
Normalized snapshot DTO
        ↓
Tauri command boundary
        ↓
Frontend repository/store
        ↓
Domain selectors (quota/burn rate/forecast)
        ↓
Status intelligence (deterministic local synthesis)
        ↓
Menu bar + dashboard + NYX character stage
```

Raw OAuth tokens, cookies, credential blobs and provider payloads never cross the Tauri IPC boundary.

## Domain model

A provider returns capabilities and a snapshot. Missing capabilities are explicit; zero is reserved for a real measured zero.

Core concepts:

- `ProviderId`
- `ProviderCapability`
- `QuotaWindow`
- `ProviderSnapshot`
- `ProviderSource`
- `UsageSample`
- `AgentSession`
- `Freshness`
- `ProviderIssue`

`ProviderSource` records only safe provenance metadata (`kind`, stable non-secret `detail`, `isFallback`). It identifies the selected quota/evidence path — remote API, local RPC/CLI/file, CYBOARD cache, or unavailable — without exposing tokens, cookies, raw provider payloads, filesystem credential locations, or account identifiers. This lets the frontend distinguish genuinely live quota evidence from a still-fresh cache without guessing from freshness alone.

Optional metrics may be attached from independent read-only collectors after the quota snapshot is built. The snapshot-level `ProviderSource` still describes the quota/evidence path; it does not claim that every optional metric used the same transport.

Usage telemetry currently has three deliberately different provider paths:

- Codex `thread-total`: CYBOARD reads only timestamp, `tokens_used` and `cwd` from the newest versioned `~/.codex/state_*.sqlite` database, normalizes `cwd` to its final project-directory name, and exposes at most 200 recent thread totals.
- Claude Code `request`: CYBOARD looks only at the 24 most recently modified transcript files below `~/.claude/projects`, reads at most the final 1 MiB of each file, keeps at most 200 recent assistant requests, deduplicates repeated streaming transcript writes by `message.id`, and normalizes only timestamp, model, project basename, input/output/cache-read/cache-write token counters. Main-loop and subagent requests are included because both consume provider tokens.
- Cursor `request`: CYBOARD reads the existing desktop login token from the newest Cursor-family `state.vscdb` in read-only mode, constructs the Cursor dashboard session cookie in memory, and requests at most 2 pages × 500 recent events from a 7-day window. Each response is capped at 4 MiB. Only explicit timestamp/model/input/output/cache-read/cache-write/measured-cost fields are normalized; Cursor project attribution remains absent because the trusted event shape does not provide repository/workspace identity.

`UsageSample.scope` keeps those meanings explicit so the dashboard does not present cumulative Codex thread totals as if they were equivalent to Claude/Cursor per-request counters. Cache-read and cache-creation tokens remain separate fields; request-level `tokens` is the total of uncached input + cache read + cache creation + output. `costUsd` is populated only from an explicit provider-measured value; CYBOARD does not estimate cost from model price tables.

Every timestamp is ISO-8601 UTC at the boundary and converted for display only in the UI.

## Status intelligence

`src/domain/statusIntelligence.ts` is a pure deterministic synthesis layer over normalized snapshots. It does not call provider APIs, read files, invoke an LLM, or mutate monitoring state.

The baseline contract is deliberately conservative:

- provider routing considers only `fresh` snapshots with a real quota window;
- the most constrained quota window is used for headroom comparisons;
- depletion warnings reuse the existing measured-history forecast contract rather than inventing a burn rate;
- stale/unavailable providers can lower confidence/tone but are never recommended as the safest route;
- nearest-reset summaries use only valid future provider-supplied reset timestamps;
- project concentration uses only request-scoped samples from the last 24 hours with explicit project attribution;
- Codex `thread-total` values are never mixed into recent-request project concentration because they are cumulative thread totals;
- intelligence output may drive Dashboard/Operator copy, but it does not retarget NYX motion, alter provider state, or trigger provider refreshes.

This keeps the Assistant layer explainable and local-first. A future query surface should resolve a bounded set of intents against the same deterministic result before considering any optional model-backed interpretation.

## Provider policy

Each provider adapter must:

1. detect whether the application/CLI is present;
2. prefer official/local read-only surfaces;
3. use network only when necessary to obtain current quota or a provider-only measured metric;
4. implement timeout, cache, backoff and stale fallback where applicable;
5. redact secrets before errors leave the adapter;
6. return partial snapshots if one metric fails;
7. report safe provider-source metadata for the selected quota path;
8. keep optional metric collectors bounded and content-minimal;
9. never infer unavailable token/project/cost fields from adjacent process state or model price tables;
10. never write provider credentials/state during monitoring.

## Polling

- one scheduler owns refreshes;
- concurrent refreshes for the same provider are coalesced;
- popover open can request a refresh but respects provider minimum intervals;
- hidden/idle app uses a slower interval;
- 429 and transient failures use exponential backoff with jitter;
- manual refresh can bypass CYBOARD cache but must not violate a provider hard throttle.

Initial policy target:

- visible dashboard: 60 s orchestration tick;
- hidden: 5 min;
- Claude live usage hard floor: 180 s;
- local process/session scanning: 15–30 s while visible, 60 s hidden;
- file watchers/events should replace polling where reliable.

## Data persistence

CYBOARD may persist only non-secret normalized historical usage, user preferences, notification state and cache metadata under its own app-data directory. Raw credentials and auth responses are forbidden.

Retention defaults:

- minute-level usage: 7 days;
- hourly rollups: 90 days;
- daily rollups: 1 year;
  These are future-facing; Phase 1 may begin with bounded JSON/SQLite storage behind a repository interface.

Current `UsageSample` values are refresh-time telemetry and are not copied into CYBOARD persistence. Codex queries avoid titles, previews, prompts, transcripts and other content columns. Claude transcript parsing never serializes message content into normalized snapshots: raw lines are held only long enough to select safe usage metadata and are then discarded. Cursor's access token and constructed cookie exist only inside the native refresh call used against Cursor's own dashboard endpoint; neither is logged, persisted by CYBOARD, nor exposed over IPC.

## Operator isolation

The operator is a presentation feature boundary and monitoring must remain useful when it fails.

NYX production uses the approved VRM/VRMA runtime:

```text
OperatorStage
  ↓
NyxVrmRuntime
  ├─ reviewed catalog VRM 0.x / 1.0 model
  ├─ allowlisted published VRMA catalog
  └─ Sig Breath ambient rest pose
```

The production component is statically imported and stays mounted across semantic-state, provider-attention,
mapping, random-playback, outfit selection, and scale changes. Those updates retarget the existing runtime; they
do not recreate the renderer, reload the model, or restart the Sig Breath clock. A reviewed character selection is
the one intentional remount boundary: it loads only the catalogued model, then captures that model's `Model pose`
rest stance before it becomes visible. If VRM loading or WebGL fails, the stage renders a lightweight CYBOARD status
surface with no character. Monitoring and provider refresh continue independently.

The main stage owns a persisted camera-interaction lock and a sanitized camera position/target pair. When locked, it
disables the mounted runtime's Orbit controls and the stage reset control without remounting or reloading the
character. The default camera distance is derived from the reviewed model height and vertical field of view, with a
versioned persisted view so an obsolete framing default is reset instead of clipping the character. Orbit/zoom
changes are saved only when an interaction ends, rather than on every rendered frame. In a
local macOS Tauri shell, the stage can also open a separate `nyx-presence` transparent, always-on-top companion
window. It has no dashboard surface, is draggable and resizable, mirrors the main stage's saved camera view, uses
the same reviewed character settings and allowlisted action mapping, and receives the normalized runtime state from
the main window through local Tauri events. Hiding and reopening the companion reuses its native window so its
session position and size remain intact; the companion also exposes an explicit restore-size control so a compact
window can always return to the 390 × 680 logical-pixel default. It is an application overlay window, not a Finder desktop-layer
integration. Its central character surface can optionally trigger a reviewed, non-repeating click reaction
(`Greeting`, `Peace sign`, `Spin`, or `Show full body`); its small top handle is the only drag target, so click and
native movement do not compete. System-event actions preempt click reactions, while reduced motion uses a brief
expression-only acknowledgement instead of skeletal playback. This local companion preference is owned by the
Character workbench and never changes the primary-stage event mapping.

The production catalog currently contains **Shion / 紫苑**, with `NYX` retained as the runtime codename. The reviewed
`VRoid Studio 2.14` catalog entry is `shion.vrm` (145 joints per skin, 3 skinned meshes, 57 morphs, 16 materials,
64,320 triangles, a complete required humanoid rig, and no embedded clips). It is rendered at its approved native
VRoid export quality; performance
behavior may suspend frames but may not silently reduce model, texture, or material quality. The historical
`7699905036472295605.glb` inspection remains an intake checkpoint, not the active production selection. A future
character can enter the catalog only after the same capability, licensing, and visual review.

Settings persist a six-event mapping (`idle | observing | processing | warning | success | offline`) to either
`relaxed + Sig Breath` or an allowlisted published VRMA ID. Arbitrary paths, URLs, and unlisted local motions
never cross this boundary. VRMA expression tracks win; curated standard-VRM face cues apply only when the source
motion has no expression tracks. The published catalog contains the attributed seven VRoid Project motions. The
Wonderful VRMA files are local-development preview assets and never enter the production catalog or bundle.
The idle skeleton is the captured final frame of the approved `Model pose` VRMA, with the relaxed expression and
Sig Breath layered on top; it is not a separately authored A-pose substitute.
The first-level Settings dialog directly exposes the six-event allowlisted mapping, opt-in random playback and its
bounded interval, and character scale (55% through 180%). These update the mounted runtime in place. The optional
Character workbench is limited to local orbit/zoom inspection, reviewed character choice (including the explicit
`紫苑 · VRoid Studio 2.14` catalog entry), and outfit compatibility; it cannot broaden
the production motion allowlist. A provider refresh with an unchanged state and unchanged mapping never replays an
action.

Outfit records are catalog metadata, not arbitrary textures. A selectable outfit must be a reviewed baked
variation compatible with the selected VRM's meshes and UVs. Shion currently exposes only the baked black-violet
tailored jacket; unrelated Techwear texture inputs are not catalogued because their Hoodie/pants UV slots do not
match this source. Future garment work must start from the saved `.vroid` source project, never from an arbitrary
runtime texture path.

The renderer consumes the small semantic state contract `idle | observing | processing | warning | success | offline`,
but it does not own provider monitoring or refresh lifecycle. The primary stage intentionally has no provider-action
buttons or dashboard HUD. A short NYX speech bubble may report an observed session closeout; it is presentation-only
and must not become a hidden motion-state input or infer task contents.
