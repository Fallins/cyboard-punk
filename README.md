<p align="center">
  <img src="./public/brand/cyboard-mark.svg" width="112" alt="CYBOARD logo" />
</p>

<h1 align="center">CYBOARD</h1>

<p align="center">
  <strong>Cyberpunk command center for your AI coding agents.</strong>
</p>

<p align="center">
  Monitor quota, reset windows, active sessions, usage trends, and provider health for Codex, Claude Code, and Cursor from one local-first macOS app.
</p>

<p align="center">
  <a href="./README.zh-TW.md">繁體中文</a> · <strong>English</strong>
</p>

> [!IMPORTANT]
> CYBOARD is a development preview. Current development happens directly on `main`; there is no stable packaged release yet. Provider integrations depend on local first-party state and upstream interfaces that can change independently.

## What is CYBOARD?

Using several AI coding tools at once makes simple questions surprisingly annoying: How much quota is left? Which window resets next? Which agent is running? Will the current burn rate exhaust a limit before reset?

CYBOARD collects those signals into a native macOS menu-bar utility plus a full dashboard, while keeping provider access behind the Rust/Tauri boundary.

The visual direction is a clean holographic cyberpunk command center. Phase 2 adds an optional original CYBOARD Operator with two profiles: **NYX** (female) and **AXON** (male). The character can also be disabled completely.

## Highlights

- **Three provider adapters** — Codex, Claude Code, and Cursor.
- **Provider visibility controls** — show or hide each provider from Settings.
- **Multiple quota windows** — 5-hour, weekly, current-plan, and provider-specific windows can coexist.
- **Explicit usage semantics** — full dashboard meters show `% used` and `% left` instead of ambiguous percentages.
- **Menu-bar first** — quick compact status plus a larger dashboard for deeper inspection.
- **Active agent sessions** — detect supported local coding-agent sessions without counting desktop helper processes as agents.
- **Burn-rate forecasting** — estimate depletion before the next reset when enough history exists.
- **Native notifications** — configurable low-capacity and reset reminders.
- **Launch at login** — optional macOS startup behavior.
- **Local-first privacy** — credentials stay in the native layer and are not exposed to the WebView.
- **Phase 2 Operator** — Female / Male / Off setting, lazy-loaded renderer boundary, hidden-window and reduced-motion suspension.
- **Performance budgets** — polling, history size, rendering, CPU, memory, and future production 3D assets are explicitly bounded.
- **Regression tests** — provider parsers, domain logic, settings, UI states, and native helpers have dedicated tests.

## Provider status

| Provider | Quota / reset | Active sessions | Current source | Notes |
| --- | --- | --- | --- | --- |
| Codex | Supported | Supported | Codex OAuth usage + app-server fallback | 5h and 7d windows |
| Claude Code | Supported with rate-limit handling | Supported | OAuth usage + CLI `/usage` fallback + CYBOARD cache | Native-version process and `claude agents --json` discovery |
| Cursor | Supported | Cursor agent detection | Read-only Cursor state + usage APIs | Cursor Models / Other Models with used and remaining semantics |

CYBOARD uses capability-based degradation: if a provider cannot expose a metric reliably, the UI shows unavailable/stale state instead of fabricating zeroes.

Antigravity was explored during Phase 1 but is **not part of the current product build**. The integration required either a running app, an extra `agy` install/sign-in, or account-dependent undocumented Google quota endpoints. The research is preserved in [`docs/antigravity.md`](./docs/antigravity.md) for future re-evaluation.

## Settings

The dashboard Settings panel currently includes:

- visibility toggles for **Codex**, **Claude Code**, and **Cursor**;
- Operator mode: **Female (NYX)** / **Male (AXON)** / **Off**;
- auto-refresh cadence;
- quota and reset notifications;
- launch at login.

Disabled providers are removed from dashboard, compact menu, ready-provider count, active-session count, trend surfaces, and notifications.

## Tech stack

- **Desktop shell:** Tauri v2
- **Frontend:** Solid.js + TypeScript + Vite
- **Native backend:** Rust
- **Desktop platform:** macOS first
- **Testing:** Vitest + Solid Testing Library + Rust tests
- **Package manager:** Bun

The frontend owns presentation and normalized domain behavior. Native process access, local provider state, credential reads, SQLite reads, and provider network calls remain behind the Rust/Tauri boundary.

## Getting started

### 1. Requirements

You need macOS, Git, Bun, Rust (`rustc` + `cargo`), and Xcode Command Line Tools. Install/sign in to any supported providers whose real quota you want to monitor.

Check the environment:

```bash
bun --version
rustc --version
cargo --version
xcode-select -p
```

Install Xcode Command Line Tools if needed:

```bash
xcode-select --install
```

Install Rust with the official toolchain if needed:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### 2. Clone and install

```bash
git clone https://github.com/Fallins/cyboard-punk.git
cd cyboard-punk
bun install
```

All current development is on `main`; no feature-branch checkout is required for normal local testing.

### 3. Run the real desktop app

```bash
bun run tauri dev
```

This starts Vite and launches the real Tauri macOS app. In development, the main CYBOARD window is shown automatically; the menu-bar icon is also installed.

The first Rust build can take noticeably longer because Cargo compiles the Tauri dependency graph. Later builds reuse cached artifacts.

### Web-only UI preview

```bash
bun run dev
```

This is useful for visual work only. Native provider access, process detection, credential/SQLite reads, notifications, and menu-bar behavior require `bun run tauri dev`.

```text
bun run dev        -> frontend UI preview only
bun run tauri dev  -> complete CYBOARD desktop application
```

## Local validation

GitHub CI is intentionally not required for this project. Before treating a change as validated, run the local checks on macOS:

```bash
bun run typecheck
bun run test
bun run build

cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml

bun run tauri dev
```

`bun run check` runs the frontend typecheck, test suite, and production frontend build together.

See [`docs/testing.md`](./docs/testing.md) for the full test strategy.

## Project structure

```text
cyboard-punk/
├── src/
│   ├── domain/             # normalized quota/usage/session models and forecasting
│   ├── notifications/      # alert rules and native notification bridge
│   ├── providers/          # frontend native-provider client
│   ├── settings/           # persisted user preferences
│   └── ui/                 # dashboard, compact menu, settings, operator surface
├── src-tauri/
│   └── src/
│       ├── providers.rs    # Codex / Claude Code / Cursor collection
│       ├── claude.rs       # resilient Claude quota adapter
│       ├── parsers.rs      # provider payload normalization
│       ├── sessions.rs     # local agent/session discovery
│       └── models.rs       # Rust-side normalized models
├── public/brand/           # CYBOARD brand assets
└── docs/                   # architecture, roadmap, testing, performance and research
```

## Phase 2 — CYBOARD Operator

Phase 2 is in progress. The dashboard already has a lazy-loaded procedural holographic renderer with two selectable profiles:

- **NYX** — female systems operator;
- **AXON** — male systems operator;
- **Off** — no character renderer; the lightweight CY core remains.

The current procedural stage is the runtime/state-machine scaffold, not the final production human model. It maps provider readiness and active sessions to semantic states, suspends non-essential animation while hidden, and bypasses WebGL under reduced-motion preferences.

The production pipeline supports drop-in GLB characters using a shared animation contract. Planned limits are <=80k visible triangles, <=2K textures, and roughly <=8 MB compressed GLB per operator where practical. See [`docs/operator-character.md`](./docs/operator-character.md) and [`docs/roadmap.md`](./docs/roadmap.md).

## Privacy and security

CYBOARD is designed as a **local-first** desktop application.

Core rules:

- provider credentials are not written into CYBOARD's application database;
- secrets are not sent to the frontend WebView;
- secrets must not appear in logs or committed test fixtures;
- provider desktop state is read-only where CYBOARD inspects it;
- failures degrade to explicit unavailable/stale states;
- real account IDs, tokens, cookies, and raw private payloads must never be committed.

Read [`PRIVACY.md`](./PRIVACY.md) and [`SECURITY.md`](./SECURITY.md) before changing provider authentication or local-data access code.

## Performance philosophy

A menu-bar monitor should not become the expensive process on the machine. CYBOARD therefore defines budgets for idle/background CPU, memory, provider polling, history retention, filesystem scanning, hidden-window animation, and Phase 2 rendering/asset weight.

See [`docs/performance.md`](./docs/performance.md).

## Contributing

Before changing the project, read [`AGENTS.md`](./AGENTS.md). Keep provider-specific behavior behind provider boundaries, add regression fixtures/tests for upstream schema changes, never commit credentials, and run the relevant local validation before considering a change complete.

## Project status

CYBOARD remains a development preview. Provider APIs and local storage formats can change independently, and the production 3D character assets are still in Phase 2 development.

The goal is simple: **a fast, private, visually distinctive command center for AI coding agents.**
