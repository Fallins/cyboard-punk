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
| Claude Code | authenticated quota or explicit cooldown/stale state; repeated app refreshes must not hammer a 429 endpoint |
| Cursor | Cursor Models / Other Models values match Cursor's own Plan & Usage screen and used/left semantics are not inverted |
| Antigravity local | with Antigravity running, Gemini and Claude/GPT quota pools are discovered or a safe unavailable state is shown |
| Antigravity cloud | with Antigravity closed, Settings → Antigravity Cloud can complete Google OAuth; quota is shown from cloud when permitted, otherwise an explicit `cloud-not-permitted` state is shown |

## Antigravity Google OAuth smoke test

Run this only in the Tauri desktop shell; browser preview intentionally cannot invoke native authentication commands.

1. Quit Antigravity so the local language server cannot satisfy the request.
2. Open CYBOARD Settings → **Antigravity Cloud**. Opening Settings should be visually immediate; native auth status may continue loading as `CHECKING…` without blocking the panel.
3. Confirm the initial state is `NOT CONNECTED` unless CYBOARD already has credentials in macOS Keychain.
4. Select **CONNECT GOOGLE**. The default browser should open promptly and the button should become **CANCEL** while CYBOARD waits for the loopback callback.
5. Complete authorization. The loopback callback must land on `127.0.0.1` and the browser should report that CYBOARD connected successfully.
6. If Google rejects the client before redirecting, use **CANCEL**; CYBOARD must not remain stuck in a connecting state until the full timeout.
7. Return to CYBOARD. Settings should report `CONNECTED` and, when available, the selected account email.
8. CYBOARD should force-refresh providers without requiring an extra manual Refresh click.
9. Accept either of these outcomes as a valid upstream result:
   - fresh Antigravity cloud quota such as `Gemini Cloud` / `Claude/GPT Cloud`; or
   - an explicit `cloud-not-permitted` error when that Google account is not allowed to read the remote quota endpoint.
10. Select **DISCONNECT** and verify the connection state returns to `NOT CONNECTED`.
11. Never copy Keychain data, OAuth callback query parameters, access/refresh tokens, or Antigravity process command lines into issues or fixtures.

The cloud path does not need Antigravity or `agy` to be running after CYBOARD has its own Google grant. Local Antigravity quota remains preferred whenever the app is already running because it can expose richer 5h/7d grouping.

## Settings and keyboard regressions
Tests and the macOS smoke pass must cover:

- independent visibility toggles for Codex / Claude Code / Cursor / Antigravity;
- hidden providers disappearing from dashboard calculations and compact-menu presentation;
- persisted Operator mode: Female / Male / Off;
- migration from the old boolean `operatorEnabled` preference;
- settings sanitization for malformed persisted data;
- Antigravity Cloud connection controls remaining disabled in browser preview and native-only in Tauri;
- Settings opens without waiting for Keychain/OAuth discovery and does not use a large-area backdrop blur over the WebGL scene;
- Settings receives keyboard focus, closes with Escape, and restores focus to the Settings button;
- the compact menu closes with Escape;
- visible `:focus-visible` rings remain present for buttons, selects and inputs;
- refresh, provider errors and OAuth waiting/error states expose polite live announcements where appropriate.

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

## Phase 2 renderer checks
The Operator is optional UI and must never prevent quota monitoring from rendering.

- `Off` must use the lightweight CY core and avoid loading the operator renderer path.
- NYX and AXON must use the same layout footprint.
- WebGL failure must fall back to the procedural CSS operator.
- hidden document/window: no intentional continuous animation frames.
- reduced motion: render a static state rather than a continuous loop.
- active agent state changes must not recreate provider clients or refetch quota solely for animation.
- renderer target is <=30 FPS with device pixel ratio capped for Retina displays.
- manual provider refresh places the Operator in `observing` while work is in flight;
- a fully healthy refresh may briefly acknowledge `success`; a warning/offline result must never be overwritten by a fake success state.

## Provider evidence labels
Until the normalized provider schema carries an explicit backend source field, the UI must remain conservative:

- Antigravity local quota may be labelled `LOCAL`;
- Antigravity cloud-normalized quota may be labelled `CLOUD`;
- stale snapshots may be labelled `CACHE`;
- unavailable snapshots may be labelled `OFFLINE`;
- Codex / Claude / Cursor should use `LIVE` rather than guessing OAuth vs CLI from frontend-visible data.

## Contract fixtures
Never commit real credentials, cookies, account IDs, CSRF values or unredacted payloads. Fixtures use synthetic identifiers. Sanitization tests must assert common token patterns are absent from logs and error serialization.

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

For the Tauri smoke test, open Settings and exercise all four provider toggles plus Female / Male / Off. Compare any provider whose official UI exposes usage against CYBOARD before declaring its parser correct.

Record any check that could not be run instead of claiming it passed.
