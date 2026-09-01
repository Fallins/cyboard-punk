# Antigravity Provider

CYBOARD supports Antigravity as a first-class provider. The current implementation is local-first and intentionally does not scrape the Antigravity UI.

## Current quota model

Antigravity exposes shared model pools rather than one independent allowance per model. CYBOARD normalizes the quota-summary response into up to four windows:

| CYBOARD label | Meaning |
| --- | --- |
| `Gemini 5h` | shared Gemini pool, rolling/session window |
| `Gemini 7d` | shared Gemini pool, weekly window |
| `Claude/GPT 5h` | shared non-Gemini pool, rolling/session window |
| `Claude/GPT 7d` | shared non-Gemini pool, weekly window |

The upstream payload reports a remaining fraction. CYBOARD converts it into the normalized `usedPercent` domain value so the full dashboard can display both used and remaining capacity consistently with other providers.

## Current local source

When Antigravity is running, CYBOARD scans local process metadata for the Antigravity/Gemini language-server process, enumerates the process's localhost listening ports, and uses the in-memory CSRF flags exposed by that process when required.

CYBOARD prefers the richer Connect-RPC endpoint:

```text
POST /exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary
Host: 127.0.0.1:<discovered port>
Connect-Protocol-Version: 1
X-Codeium-Csrf-Token: <memory-only local token when required>
```

The request body is:

```json
{ "forceRefresh": true }
```

If the quota-summary endpoint is unavailable, CYBOARD can fall back to the supported local status/model-config payloads and normalize whatever quota information is actually present. Tokens discovered from process metadata are never serialized to the WebView, never written to CYBOARD storage, and never logged.

## Last-known-good cache

A successful Antigravity local snapshot is persisted under CYBOARD's own macOS Application Support cache. This cache contains normalized quota values and reset timestamps only; it does **not** contain Antigravity credentials or CSRF tokens.

When the live Antigravity service disappears, CYBOARD may show the cached snapshot as `stale` instead of immediately replacing the whole card with `Quota unavailable`.

The cache is deliberately conservative:

- a cached quota lane is discarded as soon as its known `resetAt` has passed;
- quota lanes without a known reset time are kept for at most 30 minutes;
- the complete cached snapshot is rejected after 24 hours;
- stale data is visibly marked and includes the original live-source failure reason.

This cache improves continuity but is **not** a substitute for a live remote source: it never invents post-reset usage.

## Supported payload shapes

The parser accepts both a bare quota summary and a language-server envelope under `response`. It tolerates the known remaining-fraction forms:

```json
{ "remainingFraction": 0.62 }
```

```json
{ "remaining": { "remainingFraction": 0.62 } }
```

```json
{ "remaining": { "case": "remainingFraction", "value": 0.62 } }
```

Unknown/disabled buckets are ignored rather than converted into fake zeroes.

## Active sessions

CYBOARD may count an explicit `agy` / `antigravity-cli` process as an active Antigravity agent session. The desktop language-server process itself is infrastructure and is deliberately not counted as an active agent.

## Closed-app strategy

The desktop-local language server only exists while Antigravity is running, so a truly fresh snapshot while the app is closed requires a second source.

CYBOARD's product rule is that ordinary users should **not** have to install an extra helper CLI just to use the monitor. The intended source order is therefore:

1. Antigravity local language server when already running;
2. CYBOARD-managed Google OAuth / Cloud Code remote quota source;
3. still-valid CYBOARD last-known-good cache;
4. optional `agy` integration only as an Advanced/power-user fallback.

The native OAuth path must use an explicitly configured CYBOARD desktop OAuth client, PKCE/loopback login, and native-only credential storage. Refresh tokens must live in macOS Keychain and must never enter WebView/localStorage state. CYBOARD must not copy a third-party OAuth client secret into the repository or silently modify Antigravity-owned credentials.

Remote Cloud Code payloads can expose less detail than Antigravity 2.x local `RetrieveUserQuotaSummary`. CYBOARD must preserve source fidelity: if a cloud response cannot prove separate 5h/7d lanes, the UI must show only the quota granularity actually returned rather than fabricating local-style windows.

## Troubleshooting

If the card says Antigravity is unavailable:

1. If Antigravity is open, wait for its language server to start and press CYBOARD Refresh.
2. If Antigravity is closed, CYBOARD may continue showing a still-valid stale cache; expired lanes correctly disappear.
3. Until CYBOARD native OAuth is completed, opening Antigravity is still required to obtain a new full local quota snapshot.
4. Capture only the normalized CYBOARD error message. Do **not** paste Antigravity process command lines because they can contain local CSRF material.

Because the local interface is undocumented/reverse-engineered, upstream application updates can change process flags, ports, endpoint paths, or payload schema. Any compatibility fix must add a synthetic regression fixture/test.
