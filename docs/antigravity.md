# Antigravity Provider

CYBOARD supports Antigravity as a first-class provider. The implementation is local-first and intentionally does not scrape the Antigravity UI.

## Source order

CYBOARD uses the least invasive source that can return useful quota data:

1. Antigravity local language server when the app is already running;
2. CYBOARD-managed Google OAuth / Cloud Code remote quota when Google has been connected in Settings;
3. still-valid CYBOARD last-known-good cache;
4. optional `agy` integration remains a future Advanced/power-user fallback and is not an installation requirement.

Local data is preferred because Antigravity 2.x can expose richer 5h + weekly group information than the remote API.

## Local quota model

Antigravity exposes shared model pools rather than one independent allowance per model. The local quota-summary response can normalize into up to four windows:

| CYBOARD label | Meaning |
| --- | --- |
| `Gemini 5h` | shared Gemini pool, rolling/session window |
| `Gemini 7d` | shared Gemini pool, weekly window |
| `Claude/GPT 5h` | shared non-Gemini pool, rolling/session window |
| `Claude/GPT 7d` | shared non-Gemini pool, weekly window |

The upstream payload reports a remaining fraction. CYBOARD converts it into the normalized `usedPercent` domain value so the dashboard can display used and remaining capacity consistently with other providers.

## Local source

When Antigravity is running, CYBOARD scans local process metadata for the Antigravity language-server process, enumerates that process's localhost listening ports, and uses in-memory CSRF flags only when required.

CYBOARD prefers:

```text
POST /exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary
Host: 127.0.0.1:<discovered port>
Connect-Protocol-Version: 1
X-Codeium-Csrf-Token: <memory-only local token when required>
```

with:

```json
{ "forceRefresh": true }
```

If that endpoint is unavailable, CYBOARD can fall back to local status/model-config payloads and normalize only the quota information actually present. Process CSRF material is never serialized to the WebView, persisted, or logged.

## Google cloud fallback

Settings exposes **Antigravity Cloud → Connect Google**. This is a browser OAuth flow with a loopback callback bound only to `127.0.0.1`.

CYBOARD resolves the desktop OAuth client in this order:

1. `ANTIGRAVITY_OAUTH_CLIENT_ID` + `ANTIGRAVITY_OAUTH_CLIENT_SECRET` development overrides;
2. OAuth client material already shipped inside the user's installed `Antigravity.app` runtime.

No Google access token or refresh token is copied from Antigravity. CYBOARD obtains its own user grant. The resulting CYBOARD credentials are stored as a generic password in **macOS Keychain**, not in WebView storage or the repository.

The requested scopes are:

```text
https://www.googleapis.com/auth/cloud-platform
https://www.googleapis.com/auth/userinfo.email
```

The remote path uses the current Cloud Code endpoints:

```text
POST https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist
POST https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota
POST https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels
```

`retrieveUserQuota` is treated as authoritative when available. `fetchAvailableModels` is only accepted as quota when it contains non-trivial quota fractions; an all-100%-remaining availability payload is rejected instead of being presented as real usage.

Remote data can be less detailed than Antigravity 2.x local data. When the cloud response only supports model-family quota, CYBOARD labels it honestly as `Gemini Cloud`, `Claude/GPT Cloud`, or `Other Cloud`; it does not fabricate local-style 5h / 7d windows.

Some Google account tiers may authenticate successfully while the remote quota endpoint returns `403 / not permitted`. In that case CYBOARD surfaces a `cloud-not-permitted` state and continues to support the local source whenever Antigravity is running. This is treated as an upstream account/API limitation, not as zero usage.

## Last-known-good cache

A successful Antigravity snapshot is persisted under CYBOARD's own macOS Application Support cache. The cache contains normalized quota values and reset timestamps only; it does **not** contain Google credentials or Antigravity CSRF tokens.

When both live sources are unavailable, CYBOARD may show that snapshot as `stale` instead of immediately replacing the whole card with `Quota unavailable`.

The cache is deliberately conservative:

- a cached quota lane is discarded as soon as its known `resetAt` has passed;
- quota lanes without a known reset time are kept for at most 30 minutes;
- the complete cached snapshot is rejected after 24 hours;
- stale data is visibly marked and includes the live-source failure reason.

The cache never invents post-reset usage.

## Supported local payload shapes

The local parser accepts both a bare quota summary and a language-server envelope under `response`. It tolerates known remaining-fraction forms such as:

```json
{ "remainingFraction": 0.62 }
```

```json
{ "remaining": { "remainingFraction": 0.62 } }
```

```json
{ "remaining": { "case": "remainingFraction", "value": 0.62 } }
```

Unknown or disabled buckets are ignored rather than converted into fake zeroes.

## Active sessions

CYBOARD may count an explicit `agy` / `antigravity-cli` process as an active Antigravity agent session. The desktop language-server process itself is infrastructure and is deliberately not counted as an active agent.

## Security rules

- Google refresh/access tokens live in macOS Keychain only.
- OAuth state is validated before accepting the loopback callback.
- The callback listener binds to `127.0.0.1`, not an external interface.
- Provider responses sent to the WebView contain normalized quota and errors only, never OAuth or CSRF material.
- No telemetry is added by this integration.
- OAuth-client discovery from the installed Antigravity runtime is an undocumented compatibility technique and can break when upstream packaging changes; synthetic parser tests must accompany compatibility fixes.

## Troubleshooting

If the card says Antigravity is unavailable:

1. Open **Settings → Antigravity Cloud**. If it says `NOT CONNECTED`, choose **CONNECT GOOGLE** and complete browser sign-in once.
2. If Google is connected but the card says `cloud-not-permitted`, that account is not currently allowed to read remote Antigravity quota; opening Antigravity still enables the local source.
3. If Antigravity is open, wait for its language server to start and press CYBOARD Refresh.
4. If all live sources fail, CYBOARD may continue showing still-valid cached lanes; expired lanes correctly disappear.
5. Capture only normalized CYBOARD error text. Do **not** paste process command lines, Keychain data, OAuth callback URLs, or token payloads.
