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
- `UsageSample`
- `AgentSession`
- `Freshness`
- `ProviderIssue`

Every timestamp is ISO-8601 UTC at the boundary and converted for display only in the UI.

## Provider policy
Each provider adapter must:
1. detect whether the application/CLI is present;
2. prefer official/local read-only surfaces;
3. use network only when necessary to obtain current quota;
4. implement timeout, cache, backoff and stale fallback;
5. redact secrets before errors leave the adapter;
6. return partial snapshots if one metric fails;
7. never write provider credentials/state during monitoring.

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
