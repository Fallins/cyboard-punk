# Security Policy

CYBOARD is a local-first desktop monitor that may need to read authentication/session material already owned by Codex, Claude Code, or Cursor in order to query first-party quota interfaces. Secret handling is therefore a hard security boundary.

## Rules
- CYBOARD never asks users to paste provider tokens into the app.
- Provider credentials/session material are read only from the provider's existing local credential/session store when required.
- Credentials never cross the Tauri IPC boundary into the WebView.
- Credentials are never persisted in CYBOARD quota history, logs, analytics, crash payloads, screenshots, fixtures, or exported diagnostics.
- Provider integration is read-only with respect to provider-owned credential stores. CYBOARD must not replace or delete provider credentials.
- HTTP authentication is performed in the Rust process. Secrets must not be placed in shell command arguments created by CYBOARD or environment variables inherited by child processes.
- Cursor's state database is queried read-only.
- Provider errors exposed to the UI are normalized and must not include authenticated response bodies that may contain secrets.
- Telemetry is off/nonexistent by default. Adding telemetry requires a separate design and opt-in privacy review.

## Provider risk classification

### Codex
CYBOARD may read the existing Codex OAuth material under the user's Codex home to query the first-party usage endpoint, with the local Codex app-server used as a fallback when available. The token stays in native memory and is not serialized into the frontend snapshot.

### Claude Code
CYBOARD may read Claude Code's existing Keychain credential or local credential file to query Anthropic's usage endpoint. CYBOARD maintains only quota payload/cache metadata and cooldown timing; it must never persist the access token itself. CLI fallbacks must disable nonessential traffic and never send user prompts merely to inspect quota/session state.

### Cursor
CYBOARD reads the existing Cursor desktop state database through read-only SQLite queries and uses the local session token only in the native request path. The token/cookie is never included in frontend diagnostics.

## Retired Antigravity research
Antigravity is not part of the current runtime. Historical implementation notes are retained in `docs/antigravity.md` only so a future reintroduction does not repeat the same security and UX mistakes. Current builds must not read Antigravity credentials, Keychain data, CSRF values, or internal Cloud Code APIs.

Undocumented/reverse-engineered provider surfaces must be isolated behind adapters, use synthetic fixtures in tests, and fail closed or degrade to unavailable/stale when schemas or authentication behavior change.

## Reporting
Do not file public issues containing tokens, cookies, credential files, private account identifiers, complete process command lines containing authentication flags, or raw authenticated provider payloads. Redact sensitive values before attaching logs.
