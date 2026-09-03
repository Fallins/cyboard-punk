# Security Policy

CYBOARD is a local-first desktop monitor that may need to read authentication/session material already owned by Codex, Claude Code, or Cursor in order to query first-party quota or usage interfaces. Secret handling is therefore a hard security boundary.

## Rules
- CYBOARD never asks users to paste provider tokens into the app.
- Provider credentials/session material are read only from the provider's existing local credential/session store when required.
- Credentials never cross the Tauri IPC boundary into the WebView.
- Credentials are never persisted in CYBOARD quota history, logs, analytics, crash payloads, screenshots, fixtures, or exported diagnostics.
- Provider integration is read-only with respect to provider-owned credential stores. CYBOARD must not replace or delete provider credentials.
- HTTP authentication is performed in the Rust process and credentials may be presented only to the owning provider's endpoint. Secrets must not be placed in shell command arguments created by CYBOARD or environment variables inherited by child processes.
- Cursor's state database is queried read-only.
- Provider errors exposed to the UI are normalized and must not include authenticated response bodies that may contain secrets.
- Optional usage collectors must be bounded; malformed or oversized upstream responses fail closed to no current usage capability rather than being partially trusted.
- Telemetry to the CYBOARD project owner is off/nonexistent by default. Adding project-owned telemetry requires a separate design and opt-in privacy review.

## Provider risk classification

### Codex
CYBOARD may read the existing Codex OAuth material under the user's Codex home to query the first-party usage endpoint, with the local Codex app-server used as a fallback when available. The token stays in native memory except while being presented to OpenAI's own authenticated endpoint and is not serialized into the frontend snapshot.

Local token activity uses only a bounded read-only query against the newest versioned Codex state database. Prompt/title/message columns are not queried.

### Claude Code
CYBOARD may read Claude Code's existing Keychain credential or local credential file to query Anthropic's usage endpoint. CYBOARD maintains only quota payload/cache metadata and cooldown timing; it must never persist the access token itself. CLI fallbacks must disable nonessential traffic and never send user prompts merely to inspect quota/session state.

Optional local request telemetry reads bounded transcript tails but only normalizes usage counters, timestamp, model and project basename. Prompt, assistant and tool content must never cross IPC.

### Cursor
CYBOARD reads the existing Cursor desktop state database through `/usr/bin/sqlite3` read-only queries. The desktop access token is decoded only far enough to construct Cursor's own dashboard session cookie and is retained in native memory only for authenticated Cursor requests. The token/cookie is never included in frontend snapshots or diagnostics and is never sent to a non-Cursor service.

Cursor request telemetry uses the dashboard usage-event endpoint with a bounded 7-day request window, at most two 500-event pages, network timeouts, and a 4 MiB response cap per page. A failed/auth-rejected/schema-invalid/oversized page invalidates that refresh's usage slice instead of publishing partial data. CYBOARD accepts only explicit measured token/cache/model/cost fields and does not invent repository attribution when the provider response does not supply one.

## Retired Antigravity research
Antigravity is not part of the current runtime. Historical implementation notes are retained in `docs/antigravity.md` only so a future reintroduction does not repeat the same security and UX mistakes. Current builds must not read Antigravity credentials, Keychain data, CSRF values, or internal Cloud Code APIs.

Undocumented/reverse-engineered provider surfaces must be isolated behind adapters, use synthetic fixtures in tests, and fail closed or degrade to unavailable/stale when schemas or authentication behavior change.

## Reporting
Do not file public issues containing tokens, cookies, credential files, private account identifiers, complete process command lines containing authentication flags, or raw authenticated provider payloads. Redact sensitive values before attaching logs.
