<p align="center">
  <img src="./public/brand/cyboard-mark.svg" width="112" alt="CYBOARD logo" />
</p>

<h1 align="center">CYBOARD</h1>

<p align="center">
  <strong>為 AI Coding Agents 打造的賽博龐克指揮中心。</strong>
</p>

<p align="center">
  在一個 local-first 的 macOS 應用裡，同時掌握 Codex、Claude Code、Cursor，以及未來更多 AI Coding 工具的額度、重置時間、執行中的任務、使用趨勢與 Provider 健康狀態。
</p>

<p align="center">
  <strong>繁體中文</strong> · <a href="./README.md">English</a>
</p>

> [!IMPORTANT]
> CYBOARD 目前仍在積極開發中，尚未提供穩定版本。Phase 1 目前位於 `feat/phase1-core`；在合併進 `main` 前，本機啟動請先切到該 branch。

## CYBOARD 是什麼？

當你同時使用多個 AI Coding 工具，很快就會碰到這些問題：

- Codex 還剩多少額度？
- Claude Code 什麼時候重置？
- Cursor 這個週期是不是快碰到上限？
- 現在哪些 Coding Agents 還在執行？
- 依照現在的消耗速度，額度會不會在重置前就用完？

CYBOARD 把這些資訊集中在同一個 macOS Menu Bar 應用與完整 Dashboard 中。

視覺方向採用乾淨的 Cyberpunk / Holographic HUD，而未來的 3D **CYBOARD Operator** 會是一個原創 AI 系統操作員，不只是裝飾性的吉祥物。

## 主要特色

- **多 Provider 監控** — 第一批支援 Codex、Claude Code、Cursor，未來可透過 Provider Adapter 持續擴充。
- **額度與重置時間** — 將不同 Provider 的限制模型正規化成一致的 UI。
- **Menu Bar 優先** — 平常用 compact panel 快速查看，需要詳細資訊時再開完整 Dashboard。
- **執行中的 Agent Sessions** — 在可靠的情況下顯示本機正在執行的 Coding Agent 與對應專案。
- **Burn Rate 預測** — 推估照目前速度是否會在下一次 reset 前耗盡額度。
- **原生通知** — 可自訂低額度警告門檻。
- **開機啟動** — 可選擇 macOS 登入後自動啟動 CYBOARD。
- **Local-first 隱私設計** — CYBOARD 不會把 Provider 憑證自行存進自己的資料庫，也不會把 secret 暴露給 WebView。
- **明確的效能預算** — 背景 polling、history、CPU、memory，以及未來 WebGL 都有明確上限。
- **可測試的 Provider Contract** — Provider parsing 與 domain logic 以 fixture 與 regression tests 為核心設計。

## Provider 支援狀態

| Provider | 額度 / reset | Active sessions | Usage history | 備註 |
| --- | --- | --- | --- | --- |
| Codex | Phase 1 | Phase 1 | 開發中 | 優先使用本機 Codex app-server |
| Claude Code | Phase 1 | Phase 1 | 開發中 | 讀取本機第一方登入狀態與 usage endpoint |
| Cursor | Phase 1 | Phase 1 | 開發中 | 以 read-only 方式讀取 Cursor desktop state |
| Gemini CLI / Antigravity / Copilot / OpenCode | 規劃中 | 規劃中 | 規劃中 | 未來 Provider Adapter |

CYBOARD 採用 capability-based 設計：如果某個 Provider 沒辦法可靠提供某項指標，就應顯示 unavailable，而不是假裝成 0。

## 技術棧

- **Desktop shell：** Tauri v2
- **Frontend：** Solid.js + TypeScript + Vite
- **Native backend：** Rust
- **主要平台：** macOS first
- **Testing：** Vitest + Solid Testing Library + Rust tests
- **Package manager：** Bun

Frontend 主要負責 UI 與正規化後的 domain 行為；process、本機 Provider 狀態、Keychain、SQLite 與 Provider network request 等 native 能力都留在 Rust/Tauri 邊界內。

## 本機啟動教學

### 1. 環境需求

你需要：

- macOS
- Git
- [Bun](https://bun.sh/)
- Rust toolchain（`rustc` + `cargo`）
- Xcode Command Line Tools
- 如果要看到真實 Provider 資料，至少安裝並登入一個目前支援的 AI Coding 工具

先確認環境：

```bash
bun --version
rustc --version
cargo --version
xcode-select -p
```

如果沒有 Xcode Command Line Tools：

```bash
xcode-select --install
```

如果還沒有 Rust，建議使用官方 `rustup`：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

安裝後確認：

```bash
rustc --version
cargo --version
```

### 2. Clone 專案

```bash
git clone https://github.com/Fallins/cyboard-punk.git
cd cyboard-punk
```

Phase 1 尚未 merge 前，再執行：

```bash
git checkout feat/phase1-core
```

### 3. 安裝 dependencies

```bash
bun install
```

### 4. 啟動完整 Desktop App

```bash
bun run tauri dev
```

這才是正常的開發啟動方式。Tauri 會自動啟動 Vite frontend，並開出真正的 macOS native application。

第一次 Rust build 通常會比較久，因為 Cargo 要下載並編譯 Tauri/Rust dependency graph；後續因為有 cache，啟動速度會快很多。

### 只開 Web UI

也可以執行：

```bash
bun run dev
```

但這只會啟動 Vite/Solid frontend，適合單純調整畫面。因為沒有 Rust/Tauri backend，所以以下功能不會正常：

- Provider 額度讀取
- 本機 process / agent 偵測
- Keychain / SQLite 存取
- macOS native notifications
- Menu Bar 行為

簡單記：

```text
bun run dev        -> 只有 frontend UI
bun run tauri dev  -> 完整 CYBOARD Desktop App
```

## 開發常用指令

```bash
# TypeScript type checking
bun run typecheck

# Frontend / domain tests + coverage
bun run test

# Watch mode tests
bun run test:watch

# Production frontend build
bun run build

# Typecheck + tests + frontend build
bun run check

# 啟動 Tauri desktop app
bun run tauri dev
```

Rust 檢查：

```bash
cd src-tauri

cargo fmt --check
cargo clippy -- -D warnings
cargo test
```

這個專案目前刻意不要求 GitHub CI，merge 前以 macOS 本機驗證為主。詳見 [`docs/testing.md`](./docs/testing.md)。

## 專案結構

```text
cyboard-punk/
├── src/
│   ├── domain/           # 正規化 quota/usage/session model 與 forecast
│   ├── notifications/    # 警告規則與 native notification bridge
│   ├── providers/        # frontend provider client contract
│   ├── settings/         # 使用者設定
│   └── ui/               # compact menu surface 與完整 dashboard
├── src-tauri/
│   └── src/
│       ├── providers.rs  # native provider collection
│       ├── parsers.rs    # provider payload normalization
│       ├── sessions.rs   # 本機 agent/process discovery
│       └── models.rs     # Rust 端 normalized models
├── public/brand/         # CYBOARD 品牌資產
└── docs/                 # architecture / roadmap / testing / performance / brand specs
```

更完整的架構說明請看 [`docs/architecture.md`](./docs/architecture.md)。

## 視覺方向

CYBOARD 不是走髒亂霓虹城市感，而是偏乾淨的 premium sci-fi cyberpunk：

- 近黑 / 深藍背景
- Cyan 系統主色
- Violet / Magenta 能量色
- 克制的 glow、glass 與 HUD layer
- 明確的 warning / danger semantic color
- 支援 reduced motion

Phase 2 會加入 lazy-loaded 的 3D **CYBOARD Operator**，並包含 idle、observing、processing、warning、success、offline 等狀態。Renderer 在視窗隱藏時必須停止運算，並提供 reduced-motion、low-power 或 WebGL failure 的靜態 fallback。

詳見 [`docs/brand.md`](./docs/brand.md) 與 [`docs/operator-character.md`](./docs/operator-character.md)。

## 隱私與安全

CYBOARD 從一開始就是 **local-first desktop app**。

核心規則包含：

- Provider credential 不應寫入 CYBOARD 自己的持久化 storage；
- secret 不可以傳進 frontend WebView；
- log 與 test fixture 不可包含 secret；
- Cursor state 只以 read-only 方式讀取；
- Provider 出錯時，顯示明確 unavailable / stale，而不是捏造資料；
- 真實 account ID、token、cookie、未去識別的 payload 不可 commit 進 repo。

修改 authentication 或本機資料讀取邏輯前，請先看 [`PRIVACY.md`](./PRIVACY.md) 與 [`SECURITY.md`](./SECURITY.md)。

## 效能原則

一個 Menu Bar 監控工具，不應該變成你跑 AI Coding Agent 時最吃效能的程式。

因此 CYBOARD 對以下項目都有明確 budget：

- idle / background CPU
- memory usage
- Provider polling frequency
- history retention
- filesystem scanning
- hidden-window rendering
- 未來 WebGL FPS、texture size、triangle count 與 asset size

詳見 [`docs/performance.md`](./docs/performance.md)。

## Roadmap

### Phase 1 — Monitoring Core

完成 Desktop shell、compact menu surface、Codex / Claude Code / Cursor adapters、quota/session 正規化、forecast、notifications、settings、tests 與效能 hardening。

### Phase 2 — CYBOARD Operator

加入 lazy-loaded Three.js/WebGL renderer、原創 3D holographic AI Operator、animation state machine、Provider-linked HUD、static fallback，以及 GPU/CPU instrumentation。

### Phase 3 — Assistant Layer

可選語音回饋、自然語言狀態查詢、任務完成摘要，以及可調整的 notification personality。

詳細內容請看 [`docs/roadmap.md`](./docs/roadmap.md)。

## Contributing

CYBOARD 還在早期階段。如果想參與：

1. 使用 Coding Agent 前先閱讀 [`AGENTS.md`](./AGENTS.md)。
2. Provider 特有邏輯必須留在 Provider boundary 內。
3. 上游 Provider schema 改動造成的 bug，要補 fixture / regression test。
4. 不可 commit credential 或真實 private provider payload。
5. 開 PR 或更新 PR 前，先跑對應的 local checks。
6. 新增視覺或監控功能時，不可破壞既有 performance / privacy budget。

由於這些 Provider 的非公開介面可能隨時獨立變動，因此 bug report 與相容性資訊都很有價值。

## 專案狀態

CYBOARD 目前仍屬於 development preview，在第一個 stable release 前，API、資料模型與 UI 結構都可能變動。

目標很簡單：**打造一個快速、私密，而且有自己鮮明視覺風格的 AI Coding Agent 統一控制中心。**
