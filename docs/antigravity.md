# Antigravity Integration Research (Retired)

> Status: **retired from the CYBOARD runtime on 2026-09-01**.
>
> This document is intentionally preserved as research. It does not describe a currently supported CYBOARD provider.

## Why the provider was removed

CYBOARD's product requirement is simple: install CYBOARD, keep using the coding tools you already use, and see useful quota without installing helper software, repeatedly authenticating, or having CYBOARD launch other applications behind your back.

The Antigravity prototype could retrieve excellent quota data in some conditions, but no source met that product bar consistently:

1. the desktop app local language server exposed the richest data but existed only while Antigravity was running;
2. the `agy` CLI exposed similarly useful localhost quota but required an additional install, sign-in, and Keychain interaction;
3. Google OAuth could authenticate successfully while the account still lacked permission to read verifiable quota;
4. reusing Antigravity-owned credentials/state would be undocumented and invasive without solving account-level API permission;
5. temporarily launching Antigravity in the background worked as a technical experiment but produced unacceptable UX.

The runtime integration, OAuth UI, Keychain dependency, cache, process adapter, provider settings, and tests were therefore removed. Antigravity should not be reintroduced until a cleaner upstream interface exists.

## What was learned

### 1. Antigravity app local language server

When the desktop app is running, its local language server can expose the most useful quota representation observed during development.

Discovery used read-only process inspection:

```text
ps -ww -axo pid=,command=
  -> identify Antigravity language_server
lsof -nP -iTCP -sTCP:LISTEN -a -p <pid>
  -> enumerate localhost listening ports
```

Antigravity 2.x commonly opens HTTPS loopback ports with a self-signed certificate. Some builds also expose an HTTP extension-server port. CSRF flags observed in process arguments included:

```text
--csrf_token
--extension_server_port
--extension_server_csrf_token
```

The preferred local Connect-RPC endpoint was:

```text
POST https://127.0.0.1:<port>/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary
Connect-Protocol-Version: 1
X-Codeium-Csrf-Token: <memory-only token when required>
```

Fallbacks observed during research:

```text
GetUserStatus
GetCommandModelConfigs
```

The rich quota summary could be normalized into four user-facing lanes:

```text
Gemini 5h
Gemini 7d
Claude/GPT 5h
Claude/GPT 7d
```

Remaining fractions were converted to CYBOARD's normalized `usedPercent` domain value.

**Product problem:** the service disappears when the Antigravity app is closed.

### 2. `agy` CLI localhost service

The `agy` / Antigravity CLI can host a local HTTPS quota service while its interactive process is alive. Mature third-party monitors use a PTY to keep `agy` alive, discover its listening ports, and call the local quota endpoint rather than scraping terminal output.

This can provide richer quota than the remote OAuth path and does not require the full desktop app to remain open.

**Product problem:** users must install another binary, launch it at least once, sign in, and potentially approve Keychain access. CYBOARD explicitly rejected making this a normal prerequisite. It remains a technically viable power-user path if the product direction changes later.

### 3. Google OAuth / Cloud Code remote APIs

A CYBOARD-managed browser OAuth prototype was built using Antigravity's installed desktop OAuth client material, a loopback callback bound to `127.0.0.1`, and macOS Keychain storage for CYBOARD's own grant.

Remote endpoints investigated included:

```text
POST https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist
POST https://cloudcode-pa.googleapis.com/v1internal:onboardUser
POST https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels
POST https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota
POST https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary
```

Important finding: **successful Google authentication does not imply quota access**.

During real-device testing, Google sign-in completed successfully but the account did not expose verifiable quota fractions. The API could return availability-style model data while the quota endpoint was effectively not permitted for that account.

CYBOARD deliberately rejected an all-100%-remaining availability response rather than presenting it as `0% used`, because model availability is not quota evidence.

**Product problem:** behavior is account-tier/API-permission dependent, and the remote representation can be less complete than the local 5h/weekly summary.

### 4. Reusing Antigravity-owned credentials

Antigravity-related state databases and runtime files can contain authentication/session material. Reusing those credentials might avoid a second login prompt in some versions.

CYBOARD chose not to ship this approach because:

- it expands the amount of another app's sensitive state CYBOARD must parse;
- the format and storage location are undocumented and can change;
- silent credential reuse is difficult to explain safely to users;
- possession of a token still does not guarantee permission to the remote quota endpoint;
- it creates significant maintenance and trust cost for a non-core provider.

If this is ever reconsidered, provider-owned credential stores must remain read-only and raw credentials must never cross the Tauri IPC boundary.

### 5. Background launch experiment

A prototype briefly launched the installed Antigravity app in the background only during a manual CYBOARD Refresh, waited for the local language server, fetched quota, and attempted to terminate only processes started by CYBOARD.

This solved the data problem technically, but it was removed immediately after UX testing.

**Product problem:** a quota monitor should not launch another heavyweight application unexpectedly. Even a hidden/background launch has startup cost, process churn, possible Dock/window side effects, and surprising behavior.

## Keychain findings

The experimental CYBOARD Google OAuth path stored its own grant in macOS Keychain. On some machines macOS may prompt for Keychain authorization. A user's login Keychain password can also be out of sync with the current Mac login password, making the prompt confusing or impossible to satisfy without Keychain maintenance.

That is too much onboarding friction for a monitoring provider whose quota endpoint is not guaranteed to work afterward.

The current CYBOARD runtime no longer links the Antigravity Keychain code and does not access the old entry. An entry created by an older development build may still exist locally; it should only be removed through an explicit user action, not by a silent migration.

## Cache experiment

The prototype had a conservative normalized last-known-good cache:

- known lanes expired at their `resetAt` time;
- lanes without reset metadata were short-lived;
- raw tokens, OAuth payloads, and CSRF values were never cached;
- stale data was labelled as stale rather than treated as live.

This worked as resilience after one successful local fetch, but it could not produce fresh quota after reset while all live sources were unavailable. Therefore cache did not solve the fundamental source problem.

## Security conclusions

Any future Antigravity implementation must keep these rules:

- never log process command lines containing CSRF/auth flags;
- localhost CSRF values are memory-only;
- OAuth access/refresh tokens never enter frontend snapshots;
- never commit real payloads, client secrets, account identifiers, or callback URLs;
- never silently overwrite/delete Antigravity-owned credentials;
- availability data must not be converted into fake quota percentages;
- background launching another app requires an explicit product decision and user consent, not an invisible fallback.

## Reintroduction criteria

Antigravity becomes worth reconsidering if at least one of these becomes true:

1. Google/Antigravity publishes a stable usage/quota API available to normal signed-in accounts;
2. Antigravity exposes a documented local quota interface that remains available without keeping the full app open;
3. a first-party installed component already present for normal Antigravity users exposes quota with no extra installation or additional login;
4. remote OAuth reliably returns real quota fractions across supported account tiers with predictable scopes and permission behavior.

In addition, a reintroduced adapter must satisfy all of the following:

- no required helper installation;
- no hidden launch of Antigravity;
- no repeated sign-in for normal use;
- bounded, understandable macOS permission prompts;
- no silent reuse of sensitive third-party credentials;
- synthetic parser fixtures and regression tests;
- graceful `unavailable` state when upstream changes.

Until then, CYBOARD deliberately supports the smaller, more reliable provider set: **Codex, Claude Code, and Cursor**.
