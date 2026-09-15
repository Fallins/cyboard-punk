<p align="center">
  <img src="./public/brand/cyboard-mark.svg" width="112" alt="CYBOARD logo" />
</p>

<h1 align="center">CYBOARD</h1>

<p align="center">
  <strong>A local-first AI coding command center for macOS.</strong>
</p>

<p align="center">
  Monitor Codex, Claude Code, and Cursor quota, reset windows, active sessions, token activity, usage trends, and provider health from one menu-bar app.
</p>

<p align="center">
  <strong>English</strong> · <a href="./README.zh-TW.md">繁體中文</a>
</p>

> [!IMPORTANT]
> CYBOARD is currently in **v1.0.0-alpha**. Provider APIs, local storage formats, and authentication flows may change independently and can temporarily affect individual integrations.

## Overview

CYBOARD is a macOS menu-bar utility for developers who use multiple AI coding tools and want one place to answer practical questions such as:

- How much quota is left?
- Which provider resets next?
- Which coding agents are currently active?
- Which projects and models are consuming tokens?
- Is the current usage pace likely to exhaust a quota before reset?

The app stays in the macOS menu bar and does **not** keep a Dock icon. A compact panel provides quick status, while the full dashboard offers detailed monitoring and history.

## Features

- **Codex, Claude Code, and Cursor** provider monitoring.
- **Quota and reset tracking** across multiple provider-specific windows.
- **Usage forecasting** based on recent quota history.
- **Token Activity** with provider-specific token, model, cache, project, and measured-cost data when the provider exposes it reliably.
- **Active agent detection** for supported local coding-agent sessions.
- **Native macOS notifications** for low-capacity and reset reminders.
- **Menu-bar first workflow** with a compact status panel and full dashboard.
- **NYX VRM character stage** with reviewed, allowlisted VRMA motion mapping, camera lock/reset controls, and an optional desktop companion.
- **English and Traditional Chinese UI** with compact time formatting such as `5h`, `2d`, and `30min`.
- **Launch at login** support.
- **Local-first privacy model**: sensitive provider state remains behind the native Rust/Tauri boundary.

## Provider support

| Provider    | Quota / Reset | Active Sessions | Token Activity                                     |
| ----------- | ------------- | --------------- | -------------------------------------------------- |
| Codex       | Supported     | Supported       | Supported when local Codex usage data is available |
| Claude Code | Supported     | Supported       | Supported from recent local request telemetry      |
| Cursor      | Supported     | Supported       | Supported when Cursor usage events are available   |

CYBOARD intentionally avoids inventing data. If a provider does not expose a metric reliably, the UI shows `N/A`, stale, cached, or offline state instead of fabricating zeroes or estimates.

## NYX Operator

NYX is CYBOARD's optional VRM visual systems operator. Her reviewed model, expression cues, and allowlisted VRMA
motions run locally. The stage stays quiet during monitoring; when CYBOARD observes a provider session closeout, NYX
briefly presents that fact in a local speech bubble. This is lifecycle feedback, not a claim about task contents.

Formal Settings maps the six normalized runtime states to reviewed published motions, controls opt-in random
playback, and keeps character scale persistent. The optional Character workbench remains a local inspection surface
for the reviewed character and outfit compatibility; it does not expand the production motion allowlist. None of
these interactions use an LLM or an external assistant service. The optional transparent desktop companion mirrors
the stage camera and can be moved or resized independently while retaining its native frame for the current app
session.

## Privacy

CYBOARD is designed as a **local-first desktop application**.

- Provider credentials are not exposed to the frontend WebView.
- Local provider state is read-only where CYBOARD inspects it.
- Token telemetry is normalized into measurements rather than exposing prompt or response content to the UI.
- Authenticated provider requests are made from the native layer and only to the relevant provider.
- Missing or unreliable data is surfaced explicitly instead of being guessed.

See [`PRIVACY.md`](./PRIVACY.md) and [`SECURITY.md`](./SECURITY.md) for details.

## Alpha installation

CYBOARD currently targets macOS. Until signed public releases are available, alpha builds can be created locally from source.

### Requirements

- macOS
- Git
- Bun
- Rust toolchain (`rustc` + `cargo`)
- Xcode Command Line Tools

Install and sign in to any supported AI coding tools you want CYBOARD to monitor.

### Run from source

```bash
git clone https://github.com/Fallins/cyboard-punk.git
cd cyboard-punk
bun install
bun run tauri dev
```

`bun run tauri dev` launches the full desktop application with native provider integrations and menu-bar behavior.

### Build an alpha package

Run the full validation suite and produce `.app` and `.dmg` bundles:

```bash
APPLE_SIGNING_IDENTITY="-" bun run bundle:alpha
```

Generated bundles are written under:

```text
src-tauri/target/release/bundle/
```

For broader distribution, use a Developer ID certificate and Apple notarization instead of ad-hoc signing.

See [`docs/alpha-release.md`](./docs/alpha-release.md) for the complete packaging workflow.

## Development

### Tech stack

- **Desktop:** Tauri 2
- **Frontend:** Solid.js + TypeScript + Vite
- **Native backend:** Rust
- **Package manager:** Bun
- **Testing:** Vitest + Solid Testing Library + Rust tests

### Common commands

```bash
bun run tauri dev     # full desktop app
bun run dev           # frontend-only preview
bun run check         # frontend + operator validation suite
```

Rust validation can also be run directly:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Project-specific architecture, testing, performance, localization, and release documentation lives in [`docs/`](./docs/).

## Project status

CYBOARD is currently a **macOS Beta** focused on reliable local monitoring for Codex, Claude Code, and Cursor. Individual provider capabilities may degrade when upstream tools change their APIs, local storage, or authentication behavior.

The project goal is simple: **a fast, private, visually distinctive command center for AI coding work.**
