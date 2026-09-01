<p align="center">
  <img src="./public/brand/cyboard-mark.svg" width="112" alt="CYBOARD logo" />
</p>

<h1 align="center">CYBOARD</h1>

<p align="center">
  <strong>為 AI Coding Agents 打造的賽博龐克指揮中心。</strong>
</p>

<p align="center">
  在一個 local-first 的 macOS 應用裡，同時掌握 Codex、Claude Code 與 Cursor 的額度、重置時間、執行中的任務、使用趨勢與 Provider 健康狀態。
</p>

<p align="center">
  <strong>繁體中文</strong> · <a href="./README.md">English</a>
</p>

> [!IMPORTANT]
> CYBOARD 目前仍是 development preview，尚未提供穩定的安裝版。現階段開發直接在 `main` 上進行；Provider 整合依賴各工具本機第一方狀態與可能獨立變動的 upstream interface。

## CYBOARD 是什麼？

同時使用多個 AI Coding 工具後，很快就會遇到這些問題：Codex 還剩多少？Claude Code 何時 reset？Cursor 這個週期用了多少？現在到底有哪些 Agent 還在執行？照目前速度會不會在 reset 前把額度燒完？

CYBOARD 把這些訊號集中到一個 macOS Menu Bar 工具與完整 Dashboard，並把 Provider 的 credential、process、SQLite 與 network access 留在 Rust/Tauri native boundary 裡。

視覺方向是乾淨的 Holographic Cyberpunk Command Center。Phase 2 已開始導入可選的原創 CYBOARD Operator：**NYX（女性）**、**AXON（男性）**，也可以完全關閉角色。

## 主要特色

- **三個 Provider Adapter** — Codex、Claude Code、Cursor。
- **Provider 顯示開關** — Settings 可分別決定每個 Provider 是否出現在介面。
- **多 Quota Window** — 同一 Provider 可同時顯示 5 小時、7 天、當期方案等不同限制。
- **明確區分 used / left** — Dashboard 同時顯示「已使用」與「剩餘」，不再用模糊百分比。
- **Menu Bar 優先** — 平常快速看 compact panel，需要詳細資訊時再開 Dashboard。
- **Active Agent Sessions** — 偵測支援的 Coding Agent session，並排除桌面 App helper / daemon 等假 session。
- **Burn Rate 預測** — 累積足夠 history 後，推估是否會在 reset 前耗盡額度。
- **原生通知** — 可設定低額度與 reset 提醒。
- **開機啟動** — 可選擇 macOS 登入後自動啟動。
- **Local-first 隱私設計** — credential 不進 WebView，也不寫進 CYBOARD quota history。
- **Phase 2 Operator** — Female / Male / Off、lazy-loaded renderer、hidden-window / reduced-motion 暫停機制。
- **效能 Budget** — polling、history、CPU、memory、rendering 與 production 3D asset 都有明確限制。
- **Regression Tests** — Provider parser、domain、settings、UI state 與 native helper 都有測試。

## Provider 支援狀態

| Provider | 額度 / Reset | Active sessions | 目前資料來源 | 備註 |
| --- | --- | --- | --- | --- |
| Codex | 已支援 | 已支援 | Codex OAuth usage + app-server fallback | 可顯示 5h / 7d |
| Claude Code | 已支援，包含 rate-limit handling | 已支援 | OAuth usage + CLI `/usage` fallback + CYBOARD cache | 支援 native version binary 與 `claude agents --json` session discovery |
| Cursor | 已支援 | Cursor agent 偵測 | read-only Cursor state + usage APIs | 顯示 Cursor Models / Other Models 的 used 與 left |

CYBOARD 採 capability-based degradation：Provider 無法可靠提供某個指標時，顯示 unavailable / stale，而不是捏造 0。

Antigravity 曾在 Phase 1 做過完整技術研究，但**目前已從正式產品 build 移除**。原因是可靠 quota 需要 Antigravity App 常駐、額外安裝／登入 `agy`，或依賴不同帳號不一定有權限的 undocumented Google quota API，整體 onboarding 與穩定性不符合 CYBOARD 的產品要求。研究紀錄保留在 [`docs/antigravity.md`](./docs/antigravity.md)。

## Settings

目前 Settings 可以設定：

- Codex / Claude Code / Cursor 各自顯示或隱藏；
- Operator：**Female (NYX)** / **Male (AXON)** / **Off**；
- Auto refresh；
- Quota / Reset notifications；
- Launch at login。

關閉的 Provider 會從 Dashboard、Menu Bar compact panel、Provider ready 數量、Active Sessions、趨勢與通知介面中移除。

## 技術棧

- **Desktop shell：** Tauri v2
- **Frontend：** Solid.js + TypeScript + Vite
- **Native backend：** Rust
- **主要平台：** macOS first
- **Testing：** Vitest + Solid Testing Library + Rust tests
- **Package manager：** Bun

Frontend 負責 presentation 與 normalized domain；process、本機 Provider state、credential / SQLite、Provider network request 留在 Rust/Tauri 邊界內。

## 本機啟動教學

### 1. 環境需求

需要 macOS、Git、Bun、Rust (`rustc` + `cargo`) 與 Xcode Command Line Tools。如果要看到真實額度，也要先安裝並登入對應的支援 Provider。

確認環境：

```bash
bun --version
rustc --version
cargo --version
xcode-select -p
```

缺少 Xcode Command Line Tools：

```bash
xcode-select --install
```

缺少 Rust，建議使用官方 `rustup`：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### 2. Clone 與安裝

```bash
git clone https://github.com/Fallins/cyboard-punk.git
cd cyboard-punk
bun install
```

目前正常開發直接使用 `main`。

### 3. 啟動真正的 Desktop App

```bash
bun run tauri dev
```

這會啟動 Vite 並開出真正的 Tauri macOS App。開發模式會直接顯示完整 CYBOARD 主視窗，同時也會在 macOS Menu Bar 建立 CYBOARD icon。

第一次 Rust build 會比較久，因為 Cargo 需要編譯 Tauri/Rust dependency graph；之後會使用 cache。

### 只看 Web UI

```bash
bun run dev
```

這只適合視覺開發。Provider 額度、本機 process、credential / SQLite、native notification、Menu Bar 等功能都需要 `bun run tauri dev`。

```text
bun run dev        -> 只有 frontend UI preview
bun run tauri dev  -> 完整 CYBOARD Desktop App
```

## 本機驗證

這個專案刻意不要求 GitHub CI。要把一個改動視為驗證完成，請在 macOS 本機執行：

```bash
bun run typecheck
bun run test
bun run build

cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml

bun run tauri dev
```

也可以用：

```bash
bun run check
```

一次跑 frontend typecheck、tests 與 production frontend build。完整測試策略請看 [`docs/testing.md`](./docs/testing.md)。

## 專案結構

```text
cyboard-punk/
├── src/
│   ├── domain/             # normalized quota/usage/session model 與 forecast
│   ├── notifications/      # 警告規則與 native notification bridge
│   ├── providers/          # frontend native-provider client
│   ├── settings/           # 使用者設定
│   └── ui/                 # dashboard、compact menu、settings、operator surface
├── src-tauri/
│   └── src/
│       ├── providers.rs    # Codex / Claude Code / Cursor collection
│       ├── claude.rs       # Claude resilient quota adapter
│       ├── parsers.rs      # Provider payload normalization
│       ├── sessions.rs     # 本機 agent/session discovery
│       └── models.rs       # Rust 端 normalized models
├── public/brand/           # CYBOARD 品牌資產
└── docs/                   # architecture / roadmap / testing / performance / research
```

## Phase 2 — CYBOARD Operator

Phase 2 已正式開始。現在 Dashboard 已經有 lazy-loaded 的 procedural holographic renderer，並可選：

- **NYX** — 女性系統操作員；
- **AXON** — 男性系統操作員；
- **Off** — 完全不載入角色 renderer，只保留輕量的 CY core。

目前 procedural stage 是 runtime / state-machine scaffold，**還不是最終 production 3D 真人模型**。它會依 Provider readiness / Active Agents 切換語意狀態，視窗隱藏時暫停非必要 animation，系統啟用 reduced motion 時也可以完全避開持續 WebGL 動畫。

Production pipeline 已預留 drop-in GLB 角色與共用 animation contract。目標限制為：每個角色 <=80k visible triangles、texture <=2K、壓縮 GLB 盡量 <=8 MB。詳見 [`docs/operator-character.md`](./docs/operator-character.md) 與 [`docs/roadmap.md`](./docs/roadmap.md)。

## 隱私與安全

CYBOARD 從一開始就是 **local-first desktop app**。

核心規則：

- Provider credential 不寫進 CYBOARD quota history 或一般應用資料；
- secret 不傳進 frontend WebView；
- log / test fixture 不包含 secret；
- 讀取 Provider desktop state 時維持 read-only；
- Provider 出錯時顯示 unavailable / stale，不捏造資料；
- 真實 account ID、token、cookie、私人 raw payload 不可 commit。

修改 authentication 或本機資料讀取前請先看 [`PRIVACY.md`](./PRIVACY.md) 與 [`SECURITY.md`](./SECURITY.md)。

## 效能原則

Menu Bar monitor 不應該反過來成為最吃資源的程式。CYBOARD 對 idle/background CPU、memory、Provider polling、history retention、filesystem scanning、hidden-window animation，以及 Phase 2 renderer / asset weight 都有 budget。

詳見 [`docs/performance.md`](./docs/performance.md)。

## Contributing

修改專案前先閱讀 [`AGENTS.md`](./AGENTS.md)。Provider-specific 行為要留在 Provider boundary，upstream schema 變動造成的 bug 要補 regression test，不可 commit credential，且完成改動前要跑對應的 local validation。

## 專案狀態

CYBOARD 目前仍是 development preview。Provider API、本機資料格式都可能獨立改動，Phase 2 production 3D character assets 也仍在製作階段。

目標很簡單：**打造一個快速、私密，而且有自己鮮明視覺風格的 AI Coding Agent 統一控制中心。**
