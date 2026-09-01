# CYBOARD Roadmap

## Product definition
CYBOARD is a macOS menu bar app plus expandable dashboard that normalizes quota, reset windows, usage, burn rate, forecast, and active-agent state across AI coding tools.

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
- [x] Claude Code authenticated quota path with cache/backoff handling
- [x] Cursor current-period usage/quota and reset period
- [x] Antigravity local quota-summary adapter for Gemini and Claude/GPT pools
- [x] provider capability negotiation so unavailable metrics render as unavailable rather than fake zeroes
- [x] parser fixtures and graceful degradation for upstream schema changes
- [ ] expand reliable local token-usage history / project attribution across all supported providers
- [ ] add Antigravity OAuth / agy fallback when the local language server is not available

### Normalized domain
- [x] quota snapshots with multiple windows
- [x] quota history separated from token usage
- [x] agent sessions
- [x] freshness/staleness metadata
- [x] provider health/errors
- [ ] richer token usage samples and project attribution where reliable

### Intelligence
- [x] burn-rate calculation
- [x] projected depletion time
- [x] threshold notifications
- [ ] safe recommendation ranking by available capacity
- [ ] reset notifications

### UX
- [x] compact provider cards
- [x] active-agent strip
- [x] usage/quota trend surface
- [x] stale/error states
- [x] settings
- [x] provider visibility settings for Codex / Claude Code / Cursor / Antigravity
- [x] reduced-motion mode
- [ ] keyboard navigation audit and final accessibility pass

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
- [x] CSS fallback holographic operator
- [x] real Three.js/WebGL procedural humanoid runtime scaffold
- [x] separate NYX / AXON runtime silhouettes
- [x] state linkage for idle / working / offline
- [x] hidden-window frame suspension
- [x] reduced-motion static rendering
- [x] <=30 FPS animation scheduling and capped device pixel ratio
- [x] WebGL failure fallback to the procedural CSS operator
- [x] production GLB/VRM asset naming, skeleton and performance contract
- [ ] production NYX GLB asset
- [ ] production AXON GLB asset
- [ ] GLB loader/material pipeline replacing procedural geometry
- [ ] full animation states: idle, observing, processing, warning, success, offline
- [ ] gaze / breath / blink animation mixer for production assets
- [ ] provider-linked holographic panels
- [ ] static poster fallback for missing production assets
- [ ] GPU/CPU budget instrumentation on the production renderer

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

## Future providers
Gemini CLI, GitHub Copilot, OpenCode, OpenRouter and other coding agents can be added only through the provider contract. Antigravity moved from the future-provider list into the active provider set in Phase 1/2 development.
