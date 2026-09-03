<p align="center">
  <img src="./public/brand/cyboard-mark.svg" width="112" alt="CYBOARD logo" />
</p>

<h1 align="center">CYBOARD</h1>

<p align="center">
  <strong>Cyberpunk command center for your AI coding agents.</strong>
</p>

<p align="center">
  Monitor quota, reset windows, active sessions, token activity, usage trends, and provider health for Codex, Claude Code, and Cursor from one local-first macOS app.
</p>

<p align="center">
  <a href="./README.zh-TW.md">繁體中文</a> · <strong>English</strong>
</p>

> [!IMPORTANT]
> CYBOARD is a development preview. Current development happens directly on `main`; there is no stable packaged release yet. Provider integrations depend on local first-party state and upstream interfaces that can change independently.

## What is CYBOARD?

Using several AI coding tools at once makes simple questions surprisingly annoying: How much quota is left? Which window resets next? Which agent is running? What has been consuming tokens? Will the current burn rate exhaust a limit before reset?

CYBOARD collects those signals into a native macOS menu-bar utility plus a full dashboard, while keeping provider credentials, process inspection, SQLite reads, and authenticated network access behind the Rust/Tauri boundary.

The visual direction is a clean holographic cyberpunk command center. The optional CYBOARD Operator currently ships with **NYX**, an original 2D/2.5D systems operator. **AXON** remains a defined future male profile, and the character surface can also be disabled completely.

## Highlights

- **Three provider adapters** — Codex, Claude Code, and Cursor.
- **Provider visibility controls** — show or hide each provider from Settings.
- **Multiple quota windows** — 5-hour, weekly, current-plan, and provider-specific windows can coexist.
- **Explicit usage semantics** — dashboard meters show `% used` and `% left` instead of ambiguous percentages.
- **Provider evidence** — conservative `LIVE` / `CACHE` / `OFFLINE` labels come from normalized source metadata rather than UI guesses.
- **Token Activity** — bounded provider-aware token telemetry with thread/request scope, project attribution where trustworthy, measured token breakdowns, model mix, and provider-measured cost where available.
- **Menu-bar first** — quick compact status plus a larger dashboard for deeper inspection.
- **Active agent sessions** — detect supported local coding-agent sessions without counting desktop helper processes as agents.
- **Burn-rate forecasting** — estimate depletion before the next reset when enough quota history exists.
- **Native notifications** — configurable low-capacity and reset reminders.
- **Launch at login** — optional macOS startup behavior.
- **Local-first privacy** — credentials stay in the native boundary, never enter the WebView, and are presented only to the owning provider when authenticated network access is required.
- **NYX 2D/2.5D Operator** — persistent 2D-only runtime with six semantic states, provider-linked attention, reduced-motion behavior, and hidden-window suspension.
- **Performance budgets** — polling, history, filesystem reads, token telemetry, and rendering are explicitly bounded.
- **Regression tests** — provider parsers, domain logic, token semantics, settings, UI states, and native helpers have dedicated tests.

## Provider status

| Provider | Quota / reset | Active sessions | Token Activity | Current sources / notes |
| --- | --- | --- | --- | --- |
| Codex | Supported | Supported | Recent local thread totals + project basename | OAuth usage + app-server fallback; newest read-only `state_*.sqlite` for optional token activity |
| Claude Code | Supported with rate-limit handling | Supported | Recent local requests + project/model + input/output/cache fields | OAuth usage + CLI `/usage` fallback + CYBOARD cache; bounded recent transcript tails for optional token activity |
| Cursor | Supported | Cursor agent detection | Recent measured dashboard requests + model/input/output/cache/cost | Read-only Cursor state for existing session auth; Cursor usage APIs; project attribution intentionally unavailable when the provider does not expose it |

CYBOARD uses capability-based degradation: if a provider cannot expose a metric reliably, the UI omits that capability or shows unavailable/stale state instead of fabricating zeroes. Token, project, model, and dollar-cost values are not estimated when the source does not provide trustworthy measurements.

Antigravity was explored during Phase 1 but is **not part of the current product build**. The integration required either a running app, an extra `agy` install/sign-in, or account-dependent undocumented Google quota endpoints. The research is preserved in [`docs/antigravity.md`](./docs/antigravity.md) for future re-evaluation.

## Settings

The dashboard Settings panel currently includes:

- visibility toggles for **Codex**, **Claude Code**, and **Cursor**;
- Operator mode: **Female (NYX)** / **Male (AXON)** / **Off**;
- auto-refresh cadence;
- quota and reset notifications;
- launch at login.

Disabled providers are removed from dashboard, compact menu, ready-provider count, active-session count, trend surfaces, token activity, and notifications.

## Tech stack

- **Desktop shell:** Tauri v2
- **Frontend:** Solid.js + TypeScript + Vite
- **Native backend:** Rust
- **Desktop platform:** macOS first
- **Testing:** Vitest + Solid Testing Library + Rust tests
- **Package manager:** Bun

The frontend owns presentation and normalized domain behavior. Native process access, local provider state, credential reads, SQLite reads, bounded local transcript inspection, and provider network calls remain behind the Rust/Tauri boundary.

## Getting started

### 1. Requirements

You need macOS, Git, Bun, Rust (`rustc` + `cargo`), and Xcode Command Line Tools. Install/sign in to any supported providers whose real quota or usage you want to monitor.

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

This is useful for visual work only. Native provider access, process detection, credential/SQLite reads, token collection, notifications, and menu-bar behavior require `bun run tauri dev`.

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

`bun run check` additionally runs the NYX source/release validators around the frontend typecheck, test suite, production build, and 2D asset validation. Rust `fmt` / `clippy` / tests remain separate local commands.

See [`docs/testing.md`](./docs/testing.md) for the full test strategy.

## Project structure

```text
cyboard-punk/
├── src/
│   ├── domain/             # normalized quota/usage/session models and forecasting
│   ├── notifications/      # alert rules and native notification bridge
│   ├── providers/          # frontend native-provider client
│   ├── settings/           # persisted user preferences
│   └── ui/                 # dashboard, compact menu, settings, token activity, operator surface
├── src-tauri/
│   └── src/
│       ├── providers.rs    # Codex / Claude Code / Cursor quota collection
│       ├── claude.rs       # resilient Claude quota adapter
│       ├── codex_usage.rs  # bounded read-only Codex thread token telemetry
│       ├── claude_usage.rs # bounded Claude request token telemetry
│       ├── cursor_usage.rs # bounded Cursor dashboard request token telemetry
│       ├── parsers.rs      # provider payload normalization
│       ├── sessions.rs     # local agent/session discovery
│       └── models.rs       # Rust-side normalized models
├── assets/operator/nyx/    # canonical NYX 2D source and rig metadata
├── public/brand/           # CYBOARD brand assets
└── docs/                   # architecture, roadmap, testing, performance and research
```

## Phase 2 — CYBOARD Operator

NYX's foundational production path is complete and awaits final local visual acceptance. The selectable profiles are:

- **NYX** — implemented female systems operator;
- **AXON** — defined male profile; production visual/runtime work remains deferred;
- **Off** — no character animation work; the lightweight CY core remains.

NYX production is **2D-only**. The runtime is `OperatorStage -> Nyx2DManagedRuntime -> Nyx2DWebGL`, stays persistently mounted across state/provider changes, and falls back to the canonical 2D source if WebGL is unavailable. It uses the approved `master.webp` source plus source-safe articulated deformation rather than a 3D/GLB character path.

The six semantic states are `idle`, `observing`, `processing`, `warning`, `success`, and `offline`. The 2.5D layer provides continuous breathing, restrained head/gaze/hair motion, weighted upper-body deformation, articulated forearms, provider-linked semantic attention, smooth retarget damping, reduced-motion behavior, and hidden/offscreen suspension. Larger turns/new joints and blink remain additive work that require approved source-backed art rather than synthetic hidden surfaces.

See [`docs/nyx-2.5d-asset-spec.md`](./docs/nyx-2.5d-asset-spec.md), [`docs/architecture.md`](./docs/architecture.md), and [`docs/roadmap.md`](./docs/roadmap.md).

## Privacy and security

CYBOARD is designed as a **local-first** desktop application.

Core rules:

- provider credentials are not written into CYBOARD history or ordinary application data;
- secrets are not sent to the frontend WebView;
- authenticated credentials are presented only to the owning provider's endpoint when required;
- secrets must not appear in logs or committed test fixtures;
- provider desktop state is read-only where CYBOARD inspects it;
- bounded token collectors expose normalized measurements rather than prompt/response content;
- failures degrade to explicit unavailable/stale/no-capability states;
- real account IDs, tokens, cookies, and raw private payloads must never be committed.

Read [`PRIVACY.md`](./PRIVACY.md) and [`SECURITY.md`](./SECURITY.md) before changing provider authentication or local-data access code.

## Performance philosophy

A menu-bar monitor should not become the expensive process on the machine. CYBOARD therefore defines budgets for idle/background CPU, memory, provider polling, history retention, filesystem scanning, bounded token telemetry, hidden-window animation, and the NYX 2D renderer.

See [`docs/performance.md`](./docs/performance.md).

## Contributing

Before changing the project, read [`AGENTS.md`](./AGENTS.md). Keep provider-specific behavior behind provider boundaries, add regression fixtures/tests for upstream schema changes, never commit credentials, and run the relevant local validation before considering a change complete.

## Project status

CYBOARD remains a development preview. Provider APIs and local storage formats can change independently. NYX's foundational 2D/2.5D implementation is closed pending local acceptance; Codex, Claude Code, and Cursor now all have conservative token-activity paths, while AXON and final macOS release-quality smoke/coverage checks remain future work.

The goal is simple: **a fast, private, visually distinctive command center for AI coding agents.**
