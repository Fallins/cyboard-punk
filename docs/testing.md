# Testing Strategy

## Pyramid
1. Pure domain unit tests: quota math, reset handling, burn rate, forecast, stale/fresh classification.
2. Provider parser fixture tests: valid, partial, malformed, null windows, unexpected fields, 401/403/429, timeout, stale cache.
3. Backend integration tests: filesystem/process/HTTP abstractions with fakes; verify redaction and read-only behavior.
4. Frontend component tests: loading, healthy, stale, unavailable, exhausted, multi-provider and reduced-motion states.
5. macOS smoke test: build app, launch, invoke mock-provider command, render dashboard, exit cleanly.

## Coverage gates
Critical TypeScript domain/provider code: statements/functions/lines >= 85%, branches >= 80%. UI snapshot styling is not chased for percentage; behavior is. Rust provider/core code should have meaningful unit coverage and every parser branch backed by fixtures.

## Contract fixtures
Never commit real credentials, cookies, account IDs or unredacted payloads. Fixtures use synthetic identifiers. Sanitization tests must assert common token patterns are absent from logs and error serialization.

## Regression rule
A production/provider-change bug is not complete until a fixture reproduces it and a regression test passes.

## Performance tests
- burn-rate/forecast over 100k usage points must finish under 100 ms on CI reference hardware or be pre-aggregated;
- parser fixtures must stay linear in payload size;
- no dashboard render may synchronously parse session-history files;
- renderer tests verify suspension when page/window becomes hidden.

## CI required checks
`bun install --frozen-lockfile` (once lock exists), `bun run typecheck`, `bun run test`, `bun run build`, `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, secret scan, macOS Tauri build smoke.
