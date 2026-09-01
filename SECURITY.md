# Security Policy

CYBOARD is a local-first desktop monitor that may need to read authentication material already owned by Codex, Claude Code, or Cursor in order to query each provider's own quota endpoint. That makes secret handling a core security boundary.

## Rules
- CYBOARD never asks users to paste provider tokens into the app.
- Provider credentials are read only from the provider's existing local credential store when required.
- Credentials never cross the Tauri IPC boundary into the WebView.
- Credentials are never persisted in CYBOARD storage, logs, analytics, crash payloads, screenshots, fixtures, or exported diagnostics.
- Phase 1 provider integration is read-only. CYBOARD must not rotate, refresh, replace, or delete provider credentials.
- HTTP authentication is performed in-process. Secrets must not be placed in shell command arguments or environment variables inherited by child processes.
- Cursor's state database is opened read-only.
- Provider errors exposed to the UI are normalized and must not include response bodies that may contain secrets.
- Telemetry is off/nonexistent by default. Adding telemetry requires a separate design review and opt-in privacy review.

## Provider risk classification
Codex uses the local Codex app-server interface for quota state and avoids reading Codex auth files directly. Claude Code may read its existing Keychain credential or local credential file to call Anthropic's usage endpoint. Cursor may read the existing desktop state database in read-only mode to call Cursor's current-usage service. Undocumented provider surfaces are isolated behind adapters and must fail closed when schemas change.

## Reporting
Do not file public issues containing tokens, cookies, credential files, private account identifiers, or raw provider payloads. Redact sensitive values before attaching logs.
