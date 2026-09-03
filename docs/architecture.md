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
Menu bar + dashboard + Operator HUD
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

NYX production is now 2D-only:

```text
OperatorStage
  ↓
Nyx2DManagedRuntime
  ↓
Nyx2DWebGL
```

If WebGL is unavailable, NYX falls back to the canonical 2D source rather than to a 3D renderer. The production operator is statically imported and persistently mounted so state/provider changes cannot replace the character with a loading fallback or restart the breathing clock.

NYX articulated 2.5D uses only the approved canonical source:
- source-alpha forearm layers are detached below the elbow;
- upper arms, shoulder caps and torso are weighted deformation of the canonical body mesh;
- exact elbow anchors are published from the final deformed body frame and consumed by forearms in the same frame;
- head, gaze, hair and provider attention are runtime motion/geometry only;
- no hidden surfaces, new hands or replacement character pixels are generated at runtime.

The renderer consumes the small semantic state contract `idle | observing | processing | warning | success | offline` and provider attention intent, but it does not own provider monitoring or refresh lifecycle. The Operator may display the shared intelligence headline as a HUD annotation; that text is presentation-only and must not become a hidden motion-state input.
