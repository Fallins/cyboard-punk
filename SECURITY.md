# Security Policy

CYBOARD is a local-first desktop monitor that may need to read authentication/session material already owned by Codex, Claude Code, Cursor, or Antigravity in order to query first-party or local quota interfaces. Secret handling is therefore a hard security boundary.

## Rules
- CYBOARD never asks users to paste provider tokens into the app.
- Provider credentials/session material are read only from the provider's existing local credential/session store when required.
- Credentials and local CSRF/session tokens never cross the Tauri IPC boundary into the WebView.
- Credentials are never persisted in CYBOARD application storage, logs, analytics, crash payloads, screenshots, fixtures, or exported diagnostics.
- Provider integration is read-only with respect to provider-owned credential stores. CYBOARD must not replace or delete provider credentials.
- HTTP authentication is performed in the Rust process. Secrets must not be placed in shell command arguments created by CYBOARD or environment variables inherited by child processes.
- Cursor's state database is queried read-only.
- Antigravity local CSRF values discovered from an already-running first-party process are memory-only and may only be used for localhost requests. Never log the process command line or CSRF value.
- Provider errors exposed to the UI are normalized and must not include authenticated response bodies that may contain secrets.
- Telemetry is off/nonexistent by default. Adding telemetry requires a separate design and opt-in privacy review.

## Provider risk classification

### Codex
CYBOARD may read the existing Codex OAuth material under the user's Codex home to query the first-party usage endpoint, with the local Codex app-server used as a fallback when available. The token stays in native memory and is not serialized into the frontend snapshot.

### Claude Code
CYBOARD may read Claude Code's existing Keychain credential or local credential file to query Anthropic's usage endpoint. CYBOARD maintains only quota payload/cache metadata and cooldown timing; it must never persist the access token itself.

### Cursor
CYBOARD reads the existing Cursor desktop state database through read-only SQLite queries and uses the local session token only in the native request path. The token/cookie is never included in frontend diagnostics.

### Antigravity
CYBOARD currently prefers the running Antigravity/Gemini local language-server interface. It discovers the local extension port and CSRF value from the running first-party process, sends the quota request only to `127.0.0.1`, and discards the CSRF value after use. Future Keychain/OAuth fallbacks must follow the same native-only credential boundary.

Undocumented/reverse-engineered provider surfaces are isolated behind adapters, must use synthetic fixtures in tests, and must fail closed or degrade to unavailable/stale when schemas or authentication behavior change.

## Reporting
Do not file public issues containing tokens, cookies, credential files, CSRF values, private account identifiers, complete process command lines containing authentication flags, or raw authenticated provider payloads. Redact sensitive values before attaching logs.
