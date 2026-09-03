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
> CYBOARD is currently in **Beta**. Provider APIs, local storage formats, and authentication flows may change independently and can temporarily affect individual integrations.

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
- **NYX Operator** with deterministic local quick actions for provider recommendation, next reset, active agents, and recent project activity.
- **English and Traditional Chinese UI** with compact time formatting such as `5H`, `2D`, and `30M`.
- **Launch at login** support.
- **Local-first privacy model**: sensitive provider state remains behind the native Rust/Tauri boundary.

## Provider support

| Provider | Quota / Reset | Active Sessions | Token Activity |
| --- | --- | --- | --- |
| Codex | Supported | Supported | Supported when local Codex usage data is available |
| Claude Code | Supported | Supported | Supported from recent local request telemetry |
| Cursor | Supported | Supported | Supported when Cursor usage events are available |

CYBOARD intentionally avoids inventing data. If a provider does not expose a metric reliably, the UI shows `N/A`, stale, cached, or offline state instead of fabricating zeroes or estimates.

## NYX Operator

NYX is CYBOARD's optional visual systems operator. She reflects normalized provider state and can answer a small set of local, deterministic status actions directly from dashboard data:

- Best provider
- Next reset
- Active agents
- Recent project

These interactions do **not** use an LLM or external assistant service.

## Privacy

CYBOARD is designed as a **local-first desktop application**.

- Provider credentials are not exposed to the frontend WebView.
- Local provider state is read-only where CYBOARD inspects it.
- Token telemetry is normalized into measurements rather than exposing prompt or response content to the UI.
- Authenticated provider requests are made from the native layer and only to the relevant provider.
- Missing or unreliable data is surfaced explicitly instead of being guessed.

See [`PRIVACY.md`](./PRIVACY.md) and [`SECURITY.md`](./SECURITY.md) for details.

## Beta installation

CYBOARD currently targets macOS. Until signed public releases are available, Beta builds can be created locally from source.

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

### Build a Beta package

Run the full validation suite and produce `.app` and `.dmg` bundles:

```bash
APPLE_SIGNING_IDENTITY="-" bun run bundle:beta
```

Generated bundles are written under:

```text
src-tauri/target/release/bundle/
```

For broader distribution, use a Developer ID certificate and Apple notarization instead of ad-hoc signing.

See [`docs/beta-release.md`](./docs/beta-release.md) for the complete packaging workflow.

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
