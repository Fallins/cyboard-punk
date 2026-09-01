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

When Antigravity is running, CYBOARD scans local process metadata for the Antigravity/Gemini language-server process and discovers:

- `--extension_server_port`
- `--extension_server_csrf_token`, falling back to `--csrf_token`

CYBOARD then sends a localhost-only JSON request to:

```text
POST /exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary
Host: 127.0.0.1:<extension port>
Connect-Protocol-Version: 1
X-Codeium-Csrf-Token: <memory-only local token>
```

The request body is:

```json
{ "forceRefresh": true }
```

The token is never serialized to the WebView, never written to CYBOARD storage, and never logged.

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

## Current limitation

The first implementation requires a discoverable local extension-server endpoint. If Antigravity is installed but the local quota service cannot be discovered, CYBOARD shows an explicit unavailable state instead of guessing.

A future adapter layer will add the richer fallback used by mature quota monitors:

1. local language-server quota summary;
2. local `agy` service when available;
3. first-party credential / Google Cloud Code quota-summary fallback.

That fallback must preserve the same security rule: credentials remain native-only and are never written back into Antigravity-owned storage.

## Troubleshooting

If the card says Antigravity is unavailable:

1. Start Antigravity and make sure the account is signed in.
2. Refresh CYBOARD after the Antigravity language server has started.
3. If it remains unavailable, capture only the normalized CYBOARD error message. Do **not** paste Antigravity process command lines because they can contain local CSRF material.

Because this is an undocumented/reverse-engineered local interface, upstream application updates can change process flags, ports, endpoint paths, or payload schema. Any compatibility fix must add a synthetic regression fixture/test.
