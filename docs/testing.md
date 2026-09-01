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
| Codex | 5h + 7d windows render and reset timestamps are plausible |
| Claude Code | authenticated 5h + 7d quota or explicit cooldown/stale state; active-session detection works for native version binaries and `claude agents --json`; repeated refreshes must not hammer a 429 endpoint |
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

- `Off` must use the lightweight CY core and avoid loading the operator renderer path.
- NYX and AXON must use the same layout footprint.
- WebGL failure must fall back to the procedural CSS operator.
- hidden document/window: no intentional continuous animation frames.
- reduced motion: render a static state rather than a continuous loop.
- active agent state changes must not recreate provider clients or refetch quota solely for animation.
- renderer target is <=30 FPS with device pixel ratio capped for Retina displays.
- manual provider refresh places the Operator in `observing` while work is in flight.
- a fully healthy refresh may briefly acknowledge `success`; a warning/offline result must never be overwritten by a fake success state.

## Provider evidence labels
Until the normalized provider schema carries an explicit backend source field, the UI stays conservative:

- fresh provider quota is labelled `LIVE`;
- stale snapshots are labelled `CACHE`;
- unavailable or quota-less snapshots are labelled `OFFLINE`.

The frontend must not guess OAuth vs CLI transport from normalized quota data.

## Contract fixtures
Never commit real credentials, cookies, account IDs or unredacted payloads. Fixtures use synthetic identifiers. Sanitization tests must assert common token patterns are absent from logs and error serialization.

## Regression rule
A production/provider-change bug is not complete until a fixture reproduces it and a regression test covers the fix.

## Performance tests
- burn-rate/forecast over 100k usage points must finish under 100 ms on reference development hardware or be pre-aggregated;
- parser fixtures must stay linear in payload size;
- no dashboard render may synchronously parse session-history files;
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

For the Tauri smoke test, open Settings and exercise all three provider toggles plus Female / Male / Off. Compare any provider whose official UI exposes usage against CYBOARD before declaring its parser correct.

Record any check that could not be run instead of claiming it passed.
