# Testing Strategy

## Pyramid
1. Pure domain unit tests: quota math, reset handling, burn rate, forecast, stale/fresh classification.
2. Provider parser fixture tests: valid, partial, malformed, null windows, unexpected fields, 401/403/429, timeout, stale cache.
3. Backend integration tests: filesystem/process/HTTP abstractions with fakes; verify redaction and read-only behavior.
4. Frontend component tests: loading, healthy, stale, unavailable, exhausted, provider visibility, operator mode, multi-provider and reduced-motion states.
5. macOS smoke test: build app, launch the Tauri shell, verify real provider surfaces, menu-bar behavior and clean shutdown/hide behavior.

## Coverage gates
Critical TypeScript domain/provider code: statements/functions/lines >= 85%, branches >= 80%. UI styling is not chased for coverage percentage; behavior is. Rust provider/core code should have meaningful unit coverage and every parser branch should have a synthetic regression fixture.

## Provider matrix
Real-device smoke testing should verify these independently because one provider failure must not invalidate the others:

| Provider | Minimum smoke check |
| --- | --- |
| Codex | 5h + 7d windows render and reset timestamps are plausible; Local Token Totals appears when the Codex state database contains token-bearing threads |
| Claude Code | authenticated 5h + 7d quota or explicit cooldown/stale state; active-session detection works for native version binaries and `claude agents --json`; repeated refreshes must not hammer a 429 endpoint; recent local request telemetry appears when transcripts contain usage |
| Cursor | Cursor Models / Other Models values match Cursor's own Plan & Usage screen and used/left semantics are not inverted |

Antigravity is intentionally excluded from the active provider matrix. Historical experiments and reintroduction criteria live in `docs/antigravity.md`.

## Settings and keyboard regressions
Tests and the macOS smoke pass must cover:

- independent visibility toggles for Codex / Claude Code / Cursor;
- persisted settings from older builds dropping retired provider IDs without breaking the dashboard denominator;
- hidden providers disappearing from dashboard calculations and compact-menu presentation;
- persisted Operator mode: Female / Male / Off;
- migration from the old boolean `operatorEnabled` preference;
- settings sanitization for malformed persisted data;
- Settings opens synchronously without provider-auth discovery work;
- Settings receives keyboard focus, closes with Escape, and restores focus to the Settings button;
- the compact menu closes with Escape;
- visible `:focus-visible` rings remain present for buttons, selects and inputs;
- refresh and provider errors expose polite live announcements where appropriate.

## Quota history persistence
Quota trend history is normalized CYBOARD data and must survive application restarts without persisting provider credentials or raw provider payloads.

- history lives under `~/Library/Application Support/CYBOARD/history/quota.json`;
- only provider IDs and normalized `QuotaSample` values are persisted;
- the format is versioned and unknown versions are ignored safely;
- each provider is bounded to 2,160 samples;
- writes use a temporary file + rename;
- on the first provider refresh after restart, persisted history is hydrated before the new sample is appended;
- repeated in-process refreshes must use current in-memory history rather than re-reading and duplicating persisted samples.

A real-device smoke check should gather at least two quota samples, quit/relaunch CYBOARD, refresh once, and confirm the Quota Trend does not reset to an empty history.

## Codex local token activity
Codex token activity is read-only local telemetry and is separate from subscription quota. It uses the newest versioned `~/.codex/state_*.sqlite` database available on the machine and must degrade to no `usage` capability if the database or expected table/columns are unavailable.

- access is performed through macOS `/usr/bin/sqlite3` in read-only mode;
- only a bounded set of the 200 most recently updated token-bearing threads is queried;
- normalized samples use thread `tokens_used`, update timestamp and the basename of `cwd` for optional project attribution;
- samples carry `scope=thread-total` so they are not confused with request-level telemetry;
- prompt text, titles, previews, first-user-message content, raw transcripts and credentials are never queried or returned;
- `logs_2.sqlite` is not used for this feature;
- modern millisecond timestamps and the legacy second timestamp fallback must both normalize to ISO-8601 UTC;
- a missing/changed Codex state schema must not break quota collection or the rest of the dashboard;
- the frontend may aggregate thread token totals by project, but must not present these local totals as authoritative remaining quota, provider billing, or dollar cost.

A real-device smoke pass should confirm that at least one known Codex project appears with a plausible local thread token total when Codex has indexed local threads.

## Claude local request telemetry
Claude request telemetry is also read-only and separate from subscription quota. The transcript format is an upstream implementation detail, so failure to parse it must only remove the optional `usage` capability; quota, sessions and the rest of CYBOARD must continue to work.

- discovery is limited to `.jsonl` files below `~/.claude/projects` and ignores symlinks/non-JSONL files;
- only the 24 most recently modified transcript files are opened;
- at most the final 1 MiB of each selected file is read, and a partial first line is discarded;
- only `type=assistant` records with non-zero `message.usage` are normalized;
- repeated streaming writes are deduplicated by `message.id`, retaining the more complete token record;
- request totals are `input_tokens + cache_read_input_tokens + cache_creation_input_tokens + output_tokens`;
- cache reads and cache creation remain separate normalized fields rather than being collapsed into uncached input;
- project attribution is only the basename of top-level `cwd`; model is a non-secret model identifier;
- `isSidechain=true` records are included because subagent requests consume real tokens;
- no prompt text, assistant content, tool input/output, transcript UUID graph or raw JSONL line crosses the Tauri boundary;
- at most 200 newest normalized request samples are returned;
- samples carry `scope=request` so UI copy and aggregation do not imply Codex-style lifetime thread totals.

Regression fixtures must cover cache/input/output arithmetic, project/model extraction, zero/non-assistant filtering, subagent inclusion and streaming-write deduplication. The frontend must show request-level IN / CACHE READ / CACHE WRITE / OUT breakdowns only where those fields actually exist.

## Active-session regressions
Session discovery is intentionally separate from quota collection.

- Codex helper/app-server processes must not count as active agents.
- Cursor extension hosts must not count as active agents.
- Claude native installer binaries under `~/.local/share/claude/versions/<version>` may be real sessions even though the executable path does not contain a normal `bin/claude` segment.
- Claude daemon infrastructure such as `daemon run`, `--bg-pty-host`, and `--bg-spare` must not count as agents.
- `claude agents --json` is preferred for live background sessions; process discovery complements it for foreground/native sessions.
- PID overlap between Claude agent-view data and process discovery must not double count a session.

## Phase 2 renderer checks
The Operator is optional UI and must never prevent quota monitoring from rendering.

- `Off` must use the lightweight CY core and avoid running NYX animation work.
- NYX production must remain 2D-only; retired NYX 3D/GLB renderer paths must not return.
- production NYX must stay persistently mounted across state and provider-attention changes; a runtime transition must not show the `CY` loading fallback.
- WebGL failure must fall back to the canonical NYX 2D source, not to a 3D renderer.
- hidden document/window: no intentional continuous animation frames.
- reduced motion: render a static state rather than a continuous loop.
- active agent or provider-attention changes must not recreate provider clients, refetch quota solely for animation, or restart the NYX breathing clock.
- renderer target is <=30 FPS with device pixel ratio capped for Retina displays.
- manual provider refresh places the Operator in `observing` while work is in flight.
- a fully healthy refresh may briefly acknowledge `success`; a warning/offline result must never be overwritten by a fake success state.
- source-alpha forearms must not leave duplicate hands/ghosts and same-frame elbow anchors must remain joined under breathing/upper-body deformation.
- WARNING remains bilateral; provider attention may bias emphasis but must not drop one arm.

## Provider source and evidence labels
The normalized provider snapshot carries explicit safe source metadata:

```text
source.kind
source.detail
source.isFallback
```

Regression coverage must verify:

- `local-cache` is labelled `CACHE` even when the cached value is still inside its fresh reuse TTL;
- stale snapshots are labelled `CACHE`;
- unavailable source/snapshots and quota-less snapshots are labelled `OFFLINE`;
- usable non-cache current quota is labelled `LIVE`;
- a network/rate-limit last-known-good merge rewrites source to `local-cache / last-known-good` with `isFallback=true`;
- source detail strings are stable, non-secret identifiers only; tokens, cookies, account IDs, credential contents and raw provider payloads must never appear in source metadata.

The frontend may use source `kind` for evidence semantics, but it must not reverse-engineer transport from quota shape, labels, issue message text, or provider-specific payload fields.

## Contract fixtures
Never commit real credentials, cookies, account IDs or unredacted payloads. Fixtures use synthetic identifiers. Sanitization tests must assert common token patterns are absent from logs and error serialization.

## Regression rule
A production/provider-change bug is not complete until a fixture reproduces it and a regression test covers the fix.

## Performance tests
- burn-rate/forecast over 100k usage points must finish under 100 ms on reference development hardware or be pre-aggregated;
- parser fixtures must stay linear in payload size;
- no dashboard render may synchronously parse session-history files;
- Codex local token activity must remain a bounded read-only SQLite query performed inside the existing blocking provider refresh path, never a frontend synchronous filesystem scan;
- Claude transcript telemetry must stay inside the blocking provider refresh path and respect the 24-file / 1-MiB-per-file / 200-sample bounds;
- renderer tests verify suspension when page/window becomes hidden;
- a hidden/disabled Operator must not keep a WebGL animation loop alive;
- Settings should not introduce a large-area backdrop blur over the Operator WebGL surface.

## Local validation
GitHub CI is intentionally not required for this project. After dependency changes run `bun install`, then before considering a development batch validated run on macOS:

```bash
bun run typecheck
bun run test
bun run build

cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml

bun run tauri dev
```

For the Tauri smoke test, open Settings and exercise all three provider toggles plus Female / Male / Off. Compare any provider whose official UI exposes usage against CYBOARD before declaring its parser correct. For Codex local telemetry, compare against a known recent project/thread rather than treating the value as account quota. For Claude local telemetry, compare a recent transcript's usage counters and confirm subagent-heavy activity is reflected without exposing transcript content in the UI.

Record any check that could not be run instead of claiming it passed.
