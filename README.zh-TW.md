<p align="center">
  <img src="./public/brand/cyboard-mark.svg" width="112" alt="CYBOARD logo" />
</p>

<h1 align="center">CYBOARD</h1>

<p align="center">
  <strong>為 macOS 打造的 Local-first AI Coding 指揮中心。</strong>
</p>

<p align="center">
  在同一個 Menu Bar App 裡掌握 Codex、Claude Code 與 Cursor 的額度、重置時間、Active Sessions、Token Activity、使用趨勢與 Provider 健康狀態。
</p>

<p align="center">
  <a href="./README.md">English</a> · <strong>繁體中文</strong>
</p>

> [!IMPORTANT]
> CYBOARD 目前為 **Beta**。Provider API、本機資料格式與登入機制都可能由上游獨立變更，因此個別 Provider 整合可能暫時受到影響。

## 產品簡介

CYBOARD 是給同時使用多個 AI Coding 工具的開發者使用的 macOS Menu Bar 工具，目標是快速回答這些實際問題：

- 還剩多少額度？
- 哪個 Provider 最快 Reset？
- 現在有哪些 Coding Agent 正在執行？
- Token 主要花在哪些 Project / Model？
- 照目前使用速度，會不會在 Reset 前耗盡額度？

CYBOARD 平常常駐在 macOS Menu Bar，**不顯示 Dock icon**。Compact Panel 適合快速查看狀態，需要更多資訊時再開完整 Dashboard。

## 主要功能

- **Codex、Claude Code、Cursor** 三個 Provider 監控。
- **Quota / Reset Tracking**，支援同一 Provider 多個限制週期。
- **Usage Forecast**，依近期 quota history 推估是否可能在 Reset 前耗盡。
- **Token Activity**，在來源可靠時顯示 Token、Model、Cache、Project 與 Provider measured cost。
- **Active Agent Detection**，偵測支援的本機 Coding Agent Session。
- **macOS Native Notifications**，提供低額度與 Reset 提醒。
- **Menu Bar First**，提供 Compact Panel 與完整 Dashboard。
- **NYX Operator**，可直接查詢推薦 Provider、下次 Reset、Active Agents 與近期 Project。
- **英文 / 繁體中文 UI**，緊湊介面使用 `5h`、`2d`、`30min` 等標準時間單位縮寫。
- **Launch at Login**，可設定登入 macOS 後自動啟動。
- **Local-first Privacy**，敏感 Provider 狀態留在 Rust/Tauri Native Boundary 內。

## Provider 支援

| Provider | Quota / Reset | Active Sessions | Token Activity |
| --- | --- | --- | --- |
| Codex | 已支援 | 已支援 | 有可用的本機 Codex Usage Data 時顯示 |
| Claude Code | 已支援 | 已支援 | 讀取近期本機 Request Telemetry |
| Cursor | 已支援 | 已支援 | Cursor Usage Events 可用時顯示 |

CYBOARD 不會為了填滿畫面而捏造數據。Provider 無法可靠提供某項資訊時，介面會顯示 `N/A`、Cached、Stale 或 Offline，而不是自行補 0 或估算值。

## NYX Operator

NYX 是 CYBOARD 可選的視覺化 Systems Operator。她會依目前的 normalized provider state 顯示狀態，並可直接回答幾個固定的本機查詢：

- 推薦 Provider
- 下次 Reset
- Active Agents
- 近期 Project

這些互動全部使用 CYBOARD 已有的本機資料與 deterministic logic，**不會呼叫 LLM 或外部 Assistant Service**。

## 隱私

CYBOARD 從設計上就是 **Local-first Desktop App**。

- Provider credential 不會暴露給 frontend WebView。
- CYBOARD 檢查本機 Provider state 時維持 read-only。
- Token telemetry 會正規化成統計數值，不會把 Prompt / Response Content 顯示到 UI。
- 需要 authenticated provider request 時，由 Native Layer 直接與對應 Provider 溝通。
- 資料不存在或不可靠時會明確顯示，不會自行推測。

詳見 [`PRIVACY.md`](./PRIVACY.md) 與 [`SECURITY.md`](./SECURITY.md)。

## Beta 安裝

CYBOARD 目前主要支援 macOS。在正式簽署的 Public Release 提供前，可以直接從原始碼建立 Beta 安裝包。

### 環境需求

- macOS
- Git
- Bun
- Rust Toolchain (`rustc` + `cargo`)
- Xcode Command Line Tools

如果要監控真實 Provider 資料，也需要先安裝並登入對應的 AI Coding 工具。

### 從原始碼啟動

```bash
git clone https://github.com/Fallins/cyboard-punk.git
cd cyboard-punk
bun install
bun run tauri dev
```

`bun run tauri dev` 會啟動完整 Desktop App，包含 Native Provider Integration 與 Menu Bar 行為。

### 建立 Beta 安裝包

執行完整驗證並產生 `.app` 與 `.dmg`：

```bash
APPLE_SIGNING_IDENTITY="-" bun run bundle:beta
```

輸出位置：

```text
src-tauri/target/release/bundle/
```

如果要正式公開給更多使用者下載，應改用 Developer ID 憑證並完成 Apple Notarization，而不是使用 ad-hoc signing。

完整流程請看 [`docs/beta-release.md`](./docs/beta-release.md)。

## 開發

### 技術棧

- **Desktop：** Tauri 2
- **Frontend：** Solid.js + TypeScript + Vite
- **Native Backend：** Rust
- **Package Manager：** Bun
- **Testing：** Vitest + Solid Testing Library + Rust Tests

### 常用指令

```bash
bun run tauri dev     # 完整 Desktop App
bun run dev           # 只有 Frontend Preview
bun run check         # Frontend + Operator Validation
```

Rust 驗證：

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

更深入的 Architecture、Testing、Performance、Localization 與 Release 文件都放在 [`docs/`](./docs/)。

## 專案狀態

CYBOARD 目前是 **macOS Beta**，核心目標是穩定監控 Codex、Claude Code 與 Cursor。Provider 上游若修改 API、本機資料格式或 Authentication，個別功能可能需要跟著調整。

專案目標很單純：**打造一個快速、私密，而且具有鮮明視覺辨識度的 AI Coding Command Center。**
