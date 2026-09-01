# CYBOARD Roadmap

## Product definition
CYBOARD is a macOS menu bar app plus expandable dashboard that normalizes quota, reset windows, usage, burn rate, forecast, and active-agent state across AI coding tools.

The current supported provider set is deliberately small and productized: **Codex, Claude Code, Cursor**. A provider is not kept merely because a reverse-engineered integration is technically possible; onboarding, privacy, stability, and idle UX are part of the support bar.

## Phase 0 — Foundation
- [x] Product scope and brand direction
- [x] Provider abstraction
- [x] Privacy rules
- [x] Testing strategy
- [x] Performance budgets
- [x] Cyberpunk design tokens and logo specification
- [x] operator prompt/specification

## Phase 1 — Monitoring core
### Desktop shell
- [x] Tauri v2 macOS application
- [x] menu-bar/tray entry and compact popover
- [x] full dashboard window
- [x] launch-at-login setting
- [x] manual refresh

### Provider adapters
- [x] Codex quota windows and reset time
- [x] Claude Code resilient quota path: cache -> OAuth usage -> CLI auth/PTY `/usage` fallback -> stale last-known-good
- [x] Claude active-session discovery across `claude agents --json` and native version-named processes
- [x] Cursor current-period usage/quota and reset period
- [x] provider capability negotiation so unavailable metrics render as unavailable rather than fake zeroes
- [x] parser fixtures and graceful degradation for upstream schema changes
- [ ] expand reliable local token-usage history / project attribution across supported providers

### Normalized domain
- [x] quota snapshots with multiple windows
- [x] quota history separated from token usage
- [x] bounded normalized quota-history persistence across app restarts
- [x] agent sessions
- [x] freshness/staleness metadata
- [x] provider health/errors
- [ ] explicit provider-source metadata in the normalized snapshot contract
- [ ] richer token usage samples and project attribution where reliable

### Intelligence
- [x] burn-rate calculation
- [x] projected depletion time
- [x] threshold notifications
- [x] configurable pre-reset notifications
- [x] safe recommendation ranking by available quota headroom

### UX
- [x] compact provider cards
- [x] active-agent strip
- [x] usage/quota trend surface
- [x] provider evidence badges using conservative LIVE / CACHE / OFFLINE semantics
- [x] stale/error states
- [x] settings
- [x] provider visibility settings for Codex / Claude Code / Cursor
- [x] reset reminder setting
- [x] capacity-routing surface
- [x] reduced-motion mode
- [x] keyboard baseline: Escape close, focus restore, visible focus rings, live status announcements
- [ ] final VoiceOver / screen-reader smoke pass on macOS

### Quality gates
- [x] TypeScript unit/component test suite established
- [x] Rust unit tests for provider parsers and native logic established
- [x] UI component tests for critical states
- [x] real-device macOS Tauri smoke-test loop established
- [x] no secret material in snapshots or UI diagnostics
- [ ] final coverage and performance-budget verification before first tagged release

GitHub CI is intentionally not required for this personal project. Validation is performed through the local macOS commands documented in `docs/testing.md`.

## Phase 2 — CYBOARD Operator
- [x] operator renderer isolated behind a lazy-loaded component boundary
- [x] Female / Male / Off persisted setting
- [x] original female operator definition: **NYX**
- [x] original male operator definition: **AXON**
- [x] NYX / AXON production character bible, image prompts and 3D modeling prompt
- [x] canonical operator asset registry and public manifest
- [x] production asset validator with optional and strict modes
- [x] CSS fallback holographic operator
- [x] real Three.js/WebGL procedural humanoid runtime scaffold
- [x] separate NYX / AXON runtime silhouettes
- [x] state linkage for idle / processing / warning / offline
- [x] six-state runtime/animation contract for idle / observing / processing / warning / success / offline
- [x] manual-refresh event linkage: observing while scanning, success acknowledgement only after healthy refresh
- [x] hidden-window frame suspension
- [x] reduced-motion static rendering
- [x] <=30 FPS animation scheduling and capped device pixel ratio
- [x] adaptive renderer quality governor for sustained frame pressure
- [x] WebGL failure fallback to the procedural CSS operator
- [x] production GLB/VRM asset naming, skeleton and performance contract
- [x] drop-in GLB loader, bounds normalization, holographic material treatment and AnimationMixer pipeline
- [x] provider-linked holographic panels
- [x] static poster fallback pipeline for reduced-motion / unavailable WebGL
- [x] renderer performance instrumentation and adaptive quality plumbing
- [ ] approved NYX visual concept
- [ ] approved AXON visual concept
- [ ] production NYX GLB asset
- [ ] production AXON GLB asset
- [ ] production NYX/AXON poster assets
- [ ] production animation clips for idle, observing, processing, warning, success and offline
- [ ] gaze / breath / blink animation mixer tuning for production assets

### Phase 2 performance contract
- character renderer must remain optional and lazy-loaded
- hidden window: zero intentional animation frames
- reduced motion: no continuous decorative animation
- ambient target: <= 30 FPS
- renderer pixel ratio capped to avoid unnecessary Retina GPU cost
- production character target: <= 80k visible triangles
- textures: <= 2K per material set, atlas where practical
- compressed GLB target: <= 8 MB per operator where practical

## Phase 3 — Assistant layer
- optional TTS voice feedback
- natural-language status questions
- completed-task summaries
- configurable notification personalities
- no voice imitation of real/copyrighted characters

## Retired provider research

### Antigravity
Antigravity was prototyped deeply during Phase 1 and then removed from the runtime on 2026-09-01. The integration could return rich local quota, but the supported paths failed CYBOARD's product bar:

- rich quota required the Antigravity app to be running; or
- `agy` required an extra install/sign-in and Keychain interaction; or
- Google OAuth remote quota was account-dependent and could authenticate successfully while still withholding verifiable quota; or
- reading undocumented app credentials/state would increase security risk without guaranteeing quota access.

The experiments, endpoints, payload findings, security considerations, and reintroduction criteria are preserved in [`antigravity.md`](./antigravity.md).

Antigravity should be reconsidered only if upstream exposes a stable quota interface that works without an extra helper install, forced background app launch, or fragile credential reuse.

## Future providers
Gemini CLI, GitHub Copilot, OpenCode, OpenRouter, and other coding agents can be added only through the provider contract and only when their support path meets the same UX/security/reliability bar as the current three providers.
