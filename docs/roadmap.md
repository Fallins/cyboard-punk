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
- [x] 3D operator prompt/spec

## Phase 1 — Monitoring core
### Desktop shell
- [ ] Tauri v2 macOS application
- [ ] menu-bar/tray entry and compact popover
- [ ] full dashboard window
- [ ] launch-at-login setting
- [ ] manual refresh

### Provider adapters
- [ ] Codex: detect installation/login, quota windows, reset time, local usage history, active sessions
- [ ] Claude Code: detect installation/login, quota windows, reset time, status snapshots, active sessions
- [ ] Cursor: detect installation/login, current-period usage/quota, reset/subscription period, active process state
- [ ] provider capability negotiation so unavailable metrics render as unavailable rather than fake zeroes
- [ ] parser fixtures and graceful degradation for upstream schema changes

### Normalized domain
- [ ] quota snapshots with multiple windows
- [ ] usage samples and project attribution where reliable
- [ ] agent sessions
- [ ] freshness/staleness metadata
- [ ] provider health/errors

### Intelligence
- [ ] burn-rate calculation
- [ ] projected depletion time
- [ ] safe recommendation ranking by available capacity
- [ ] threshold notifications (50/20/10/5 configurable)
- [ ] reset notifications

### UX
- [ ] compact provider cards
- [ ] active-agent strip
- [ ] usage chart
- [ ] stale/error states
- [ ] settings
- [ ] reduced-motion mode
- [ ] keyboard navigation and accessible labels

### Quality gates
- [ ] TypeScript unit coverage >= 85% statements/functions/lines and >= 80% branches for domain/provider parsing
- [ ] Rust unit/integration tests for commands/providers
- [ ] UI component tests for critical states
- [ ] smoke E2E on macOS CI
- [ ] no secret material in logs/snapshots/test artifacts
- [ ] performance budgets pass

## Phase 2 — CYBOARD Operator
- [ ] lazy-loaded WebGL/Three.js scene isolated behind `OperatorRenderer`
- [ ] original female holographic AI operator, not derived from copyrighted characters
- [ ] VRM/GLB asset pipeline
- [ ] states: idle, observing, processing, warning, success, offline
- [ ] subtle gaze/breath/blink loops
- [ ] provider-linked holographic panels
- [ ] suspend renderer when hidden/menu popover closed
- [ ] static 2D fallback for low power/reduced motion/WebGL failure
- [ ] GPU/CPU budget instrumentation

## Phase 3 — Assistant layer
- optional TTS voice feedback
- natural-language status questions
- completed-task summaries
- configurable notification personalities
- no voice imitation of real/copyrighted characters

## Future providers
Gemini CLI, Antigravity, GitHub Copilot, OpenCode, OpenRouter and other coding agents can be added only through the provider contract.
