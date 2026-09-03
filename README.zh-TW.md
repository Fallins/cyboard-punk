<p align="center">
  <img src="./public/brand/cyboard-mark.svg" width="112" alt="CYBOARD logo" />
</p>

<h1 align="center">CYBOARD</h1>

<p align="center">
  <strong>為 AI Coding Agents 打造的賽博龐克指揮中心。</strong>
</p>

<p align="center">
  在一個 local-first 的 macOS 應用裡，同時掌握 Codex、Claude Code 與 Cursor 的額度、重置時間、執行中的任務、Token Activity、使用趨勢與 Provider 健康狀態。
</p>

<p align="center">
  <strong>繁體中文</strong> · <a href="./README.md">English</a>
</p>

> [!IMPORTANT]
> CYBOARD 目前仍是 development preview，尚未提供穩定的安裝版。現階段開發直接在 `main` 上進行；Provider 整合依賴各工具本機第一方狀態與可能獨立變動的 upstream interface。

## CYBOARD 是什麼？

同時使用多個 AI Coding 工具後，很快就會遇到這些問題：Codex 還剩多少？Claude Code 何時 reset？Cursor 這個週期用了多少？現在到底有哪些 Agent 還在執行？Token 都花在哪裡？照目前速度會不會在 reset 前把額度燒完？

CYBOARD 把這些訊號集中到一個 macOS Menu Bar 工具與完整 Dashboard，並把 Provider credential、process inspection、SQLite 讀取與 authenticated network access 留在 Rust/Tauri native boundary 裡。

視覺方向是乾淨的 Holographic Cyberpunk Command Center。可選的 CYBOARD Operator 目前已完成原創角色 **NYX** 的 2D/2.5D production path；**AXON** 是已定義但仍待後續製作的男性 profile，也可以完全關閉角色。

## 主要特色

- **三個 Provider Adapter** — Codex、Claude Code、Cursor。
- **Provider 顯示開關** — Settings 可分別決定每個 Provider 是否出現在介面。
- **多 Quota Window** — 同一 Provider 可同時顯示 5 小時、7 天、當期方案等不同限制。
- **明確區分 used / left** — Dashboard 同時顯示「已使用」與「剩餘」，不再用模糊百分比。
- **Provider Evidence** — `LIVE` / `CACHE` / `OFFLINE` 由 normalized source metadata 決定，不由前端猜測。
- **Token Activity** — 依 Provider 保留 thread / request 不同語意；可顯示可信的 project attribution、input/output/cache breakdown、model mix，以及 Provider 明確回傳的 measured cost。
- **Menu Bar 優先** — 平常快速看 compact panel，需要詳細資訊時再開 Dashboard。
- **Active Agent Sessions** — 偵測支援的 Coding Agent session，並排除桌面 App helper / daemon 等假 session。
- **Burn Rate 預測** — 累積足夠 quota history 後，推估是否會在 reset 前耗盡額度。
- **原生通知** — 可設定低額度與 reset 提醒。
- **開機啟動** — 可選擇 macOS 登入後自動啟動。
- **Local-first 隱私設計** — credential 不進 WebView；只有需要 authenticated network access 時才會在 native layer 送回 credential 所屬 Provider 自己的 endpoint。
- **NYX 2D/2.5D Operator** — 2D-only persistent runtime、六種 semantic states、provider-linked attention、reduced-motion 與 hidden-window suspension。
- **效能 Budget** — polling、history、filesystem read、token telemetry 與 rendering 都有明確上限。
- **Regression Tests** — Provider parser、domain、token semantics、settings、UI state 與 native helper 都有測試。

## Provider 支援狀態

| Provider | 額度 / Reset | Active sessions | Token Activity | 目前資料來源 / 備註 |
| --- | --- | --- | --- | --- |
| Codex | 已支援 | 已支援 | 最近本機 thread total + project basename | OAuth usage + app-server fallback；optional token activity 唯讀最新 `state_*.sqlite` |
| Claude Code | 已支援，包含 rate-limit handling | 已支援 | 最近本機 request + project/model + input/output/cache | OAuth usage + CLI `/usage` fallback + CYBOARD cache；optional token activity 僅讀 bounded recent transcript tails |
| Cursor | 已支援 | Cursor agent 偵測 | 最近 Provider measured request + model/input/output/cache/cost | 唯讀 Cursor state 取得既有登入 session，再呼叫 Cursor usage API；Provider 未提供可靠 repo/workspace identity 時不捏造 project attribution |

CYBOARD 採 capability-based degradation：Provider 無法可靠提供某個指標時，就不提供該 capability 或顯示 unavailable / stale，而不是捏造 0。Token、project、model、cost 也不會在來源沒有可靠資料時自行估算。

Antigravity 曾在 Phase 1 做過完整技術研究，但**目前已從正式產品 build 移除**。原因是可靠 quota 需要 Antigravity App 常駐、額外安裝／登入 `agy`，或依賴不同帳號不一定有權限的 undocumented Google quota API，整體 onboarding 與穩定性不符合 CYBOARD 的產品要求。研究紀錄保留在 [`docs/antigravity.md`](./docs/antigravity.md)。

## Settings

目前 Settings 可以設定：

- Codex / Claude Code / Cursor 各自顯示或隱藏；
- Operator：**Female (NYX)** / **Male (AXON)** / **Off**；
- Auto refresh；
- Quota / Reset notifications；
- Launch at login。

關閉的 Provider 會從 Dashboard、Menu Bar compact panel、Provider ready 數量、Active Sessions、quota trend、Token Activity 與通知介面中移除。

## 技術棧

- **Desktop shell：** Tauri v2
- **Frontend：** Solid.js + TypeScript + Vite
- **Native backend：** Rust
- **主要平台：** macOS first
- **Testing：** Vitest + Solid Testing Library + Rust tests
- **Package manager：** Bun

Frontend 負責 presentation 與 normalized domain；process、本機 Provider state、credential / SQLite、bounded local transcript inspection、Provider network request 留在 Rust/Tauri 邊界內。

## 本機啟動教學

### 1. 環境需求

需要 macOS、Git、Bun、Rust (`rustc` + `cargo`) 與 Xcode Command Line Tools。如果要看到真實額度或 usage，也要先安裝並登入對應的支援 Provider。

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

這只適合視覺開發。Provider 額度、本機 process、credential / SQLite、token collection、native notification、Menu Bar 等功能都需要 `bun run tauri dev`。

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

`bun run check` 會把 NYX source/release validators、frontend typecheck、tests、production build 與 2D asset validation 串起來；Rust `fmt` / `clippy` / tests 仍是獨立的本機驗證。完整測試策略請看 [`docs/testing.md`](./docs/testing.md)。

## 專案結構

```text
cyboard-punk/
├── src/
│   ├── domain/             # normalized quota/usage/session model 與 forecast
│   ├── notifications/      # 警告規則與 native notification bridge
│   ├── providers/          # frontend native-provider client
│   ├── settings/           # 使用者設定
│   └── ui/                 # dashboard、compact menu、settings、token activity、operator surface
├── src-tauri/
│   └── src/
│       ├── providers.rs    # Codex / Claude Code / Cursor quota collection
│       ├── claude.rs       # Claude resilient quota adapter
│       ├── codex_usage.rs  # bounded read-only Codex thread token telemetry
│       ├── claude_usage.rs # bounded Claude request token telemetry
│       ├── cursor_usage.rs # bounded Cursor dashboard request token telemetry
│       ├── parsers.rs      # Provider payload normalization
│       ├── sessions.rs     # 本機 agent/session discovery
│       └── models.rs       # Rust 端 normalized models
├── assets/operator/nyx/    # canonical NYX 2D source 與 rig metadata
├── public/brand/           # CYBOARD 品牌資產
└── docs/                   # architecture / roadmap / testing / performance / research
```

## Phase 2 — CYBOARD Operator

NYX foundational production path 已完成，現在只差本機最終 visual acceptance。可選 profile：

- **NYX** — 已實作的女性 systems operator；
- **AXON** — 已定義的男性 profile，production visual/runtime 尚未製作；
- **Off** — 不執行角色 animation，只保留輕量 CY core。

NYX production 現在是 **2D-only**。Runtime 為 `OperatorStage -> Nyx2DManagedRuntime -> Nyx2DWebGL`，state / provider attention 切換時維持 persistent mount；WebGL 無法使用時回退 canonical 2D source，不再存在 3D / GLB production path。

六種 semantic states 為 `idle`、`observing`、`processing`、`warning`、`success`、`offline`。2.5D layer 包含 continuous breathing、restrained head/gaze/hair motion、weighted upper-body deformation、articulated forearms、provider-linked semantic attention、smooth retarget damping、reduced-motion 與 hidden/offscreen suspension。較大幅度轉身、新 joint 與 blink 都屬後續 additive work，必須先有 approved source-backed art，不能用 synthetic hidden surface 硬補。

詳見 [`docs/nyx-2.5d-asset-spec.md`](./docs/nyx-2.5d-asset-spec.md)、[`docs/architecture.md`](./docs/architecture.md) 與 [`docs/roadmap.md`](./docs/roadmap.md)。

## 隱私與安全

CYBOARD 從一開始就是 **local-first desktop app**。

核心規則：

- Provider credential 不寫進 CYBOARD history 或一般應用資料；
- secret 不傳進 frontend WebView；
- 需要 authenticated network access 時，credential 只能送回它所屬 Provider 自己的 endpoint；
- log / test fixture 不包含 secret；
- 讀取 Provider desktop state 時維持 read-only；
- bounded token collector 只 expose normalized measurement，不把 prompt / response content 傳進 UI；
- Provider 出錯時顯示 unavailable / stale / no-capability，不捏造資料；
- 真實 account ID、token、cookie、私人 raw payload 不可 commit。

修改 authentication 或本機資料讀取前請先看 [`PRIVACY.md`](./PRIVACY.md) 與 [`SECURITY.md`](./SECURITY.md)。

## 效能原則

Menu Bar monitor 不應該反過來成為最吃資源的程式。CYBOARD 對 idle/background CPU、memory、Provider polling、history retention、filesystem scanning、bounded token telemetry、hidden-window animation，以及 NYX 2D renderer 都有 budget。

詳見 [`docs/performance.md`](./docs/performance.md)。

## Contributing

修改專案前先閱讀 [`AGENTS.md`](./AGENTS.md)。Provider-specific 行為要留在 Provider boundary，upstream schema 變動造成的 bug 要補 regression test，不可 commit credential，且完成改動前要跑對應的 local validation。

## 專案狀態

CYBOARD 目前仍是 development preview。Provider API、本機資料格式都可能獨立改動；NYX foundational 2D/2.5D implementation 已封版、等待本機驗收；Codex、Claude Code、Cursor 都已有保守的 Token Activity 路徑。AXON 與最終 macOS release-quality smoke / coverage check 則仍是後續工作。

目標很簡單：**打造一個快速、私密，而且有自己鮮明視覺風格的 AI Coding Agent 統一控制中心。**
