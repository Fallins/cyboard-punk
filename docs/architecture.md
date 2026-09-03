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
Domain selectors (burn rate/forecast)
        ↓
Menu bar + dashboard
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

Local usage telemetry currently has two deliberately different scopes:

- Codex `thread-total`: CYBOARD reads only timestamp, `tokens_used` and `cwd` from the newest versioned `~/.codex/state_*.sqlite` database, normalizes `cwd` to its final project-directory name, and exposes at most 200 recent thread totals.
- Claude Code `request`: CYBOARD looks only at the 24 most recently modified transcript files below `~/.claude/projects`, reads at most the final 1 MiB of each file, keeps at most 200 recent assistant requests, deduplicates repeated streaming transcript writes by `message.id`, and normalizes only timestamp, model, project basename, input/output/cache-read/cache-write token counters. Main-loop and subagent requests are included because both consume provider tokens.

`UsageSample.scope` keeps those meanings explicit so the dashboard does not present cumulative Codex thread totals as if they were equivalent to Claude per-request counters. Claude cache-read and cache-creation tokens remain separate fields; `tokens` is the total of uncached input + cache read + cache creation + output for that request.

Every timestamp is ISO-8601 UTC at the boundary and converted for display only in the UI.

## Provider policy
Each provider adapter must:
1. detect whether the application/CLI is present;
2. prefer official/local read-only surfaces;
3. use network only when necessary to obtain current quota;
4. implement timeout, cache, backoff and stale fallback;
5. redact secrets before errors leave the adapter;
6. return partial snapshots if one metric fails;
7. report safe provider-source metadata for the selected quota path;
8. keep optional local metric collectors bounded and content-minimal;
9. never write provider credentials/state during monitoring.

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

Codex and Claude `UsageSample` values currently come from provider-owned local data on refresh and are not copied into CYBOARD persistence. Codex queries avoid titles, previews, prompts, transcripts and other content columns. Claude transcript parsing never serializes message content into normalized snapshots: raw lines are held only long enough to select safe usage metadata and are then discarded.

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

The renderer consumes the small semantic state contract `idle | observing | processing | warning | success | offline` and provider attention intent, but it does not own provider monitoring or refresh lifecycle.
