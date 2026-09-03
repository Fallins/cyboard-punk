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
- [x] Codex read-only local token totals and project attribution from the newest versioned state SQLite database
- [x] Claude Code resilient quota path: cache -> OAuth usage -> CLI auth/PTY `/usage` fallback -> stale last-known-good
- [x] Claude active-session discovery across `claude agents --json` and native version-named processes
- [x] Claude bounded local request token telemetry from recent transcript tails, including project/model and input/output/cache fields when present
- [x] Cursor current-period usage/quota and reset period
- [x] Cursor bounded recent request token telemetry from its dashboard usage-event surface using the already-local desktop session; input/output/cache/model/cost are accepted only when explicitly measured
- [x] provider capability negotiation so unavailable metrics render as unavailable rather than fake zeroes
- [x] parser fixtures and graceful degradation for upstream schema changes
- [x] reliable token telemetry paths established for Codex / Claude Code / Cursor without estimating missing token values
- [x] Cursor project attribution intentionally remains unavailable because current trusted usage events do not expose repo/workspace identity; CYBOARD does not guess it

### Normalized domain
- [x] quota snapshots with multiple windows
- [x] quota history separated from token usage
- [x] bounded normalized quota-history persistence across app restarts
- [x] agent sessions
- [x] freshness/staleness metadata
- [x] provider health/errors
- [x] explicit provider-source metadata in the normalized snapshot contract
- [x] normalized token totals and project attribution for reliable Codex local thread data
- [x] richer Claude request usage samples with input/output/cache-read/cache-write/model/project metadata
- [x] richer Cursor request usage samples with input/output/cache-read/cache-write/model/measured-cost metadata
- [x] usage sample scope distinguishes thread totals from request-level events so provider semantics are not mixed silently

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
- [x] token activity surface with provider-aware request/thread semantics
- [x] token input/output/cache breakdown when measured
- [x] top-project breakdown where attribution is trustworthy
- [x] model-mix and measured-cost surface where providers expose those fields
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

### Runtime architecture
- [x] Female / Male / Off persisted setting
- [x] original female operator definition: **NYX**
- [x] original male operator definition: **AXON**
- [x] NYX v1.0 visual identity approved and locked
- [x] NYX canonical source hierarchy and source-integrity validation
- [x] NYX production runtime is **2D-only**
- [x] `OperatorStage -> Nyx2DManagedRuntime -> Nyx2DWebGL` production path
- [x] canonical 2D fallback when WebGL is unavailable
- [x] production NYX stays persistently mounted; state/provider changes do not remount through Suspense
- [x] retired NYX 3D renderer / GLB / rollback path removed and guarded by release validation
- [x] monitoring remains independent from operator renderer failure

### NYX articulated 2.5D v1
- [x] canonical `master.webp` is the only displayed NYX RGB source
- [x] source-alpha detached forearm layers with shared erase/segmentation truth
- [x] weighted canonical body mesh deformation for upper arm, shoulder cap and torso
- [x] same-frame exact elbow anchor publication and forearm consumption
- [x] restrained head motion with torso-breath inheritance
- [x] source-safe gaze and hair follow-through
- [x] continuous breathing clock across live states/provider retargets
- [x] provider-linked semantic attention for head / torso / shoulders / operation hand
- [x] six-state semantic contract: idle / observing / processing / warning / success / offline
- [x] OBSERVE / PROCESS provider-side operation hand
- [x] WARNING bilateral brace
- [x] SUCCESS compact acknowledgement with right-side mirror when intended
- [x] continuous provider retarget damping (head faster than body/arms)
- [x] hidden/offscreen suspension and reduced-motion behavior
- [x] runtime diagnostics and performance guardrails
- [x] state × provider regression matrix
- [x] foundational implementation closed at checkpoint `0.25.0`
- [ ] local `0.25.0` production acceptance sign-off

### Deferred / additive operator work
- [ ] approved AXON visual concept and production path
- [ ] NYX blink only after approved source-derived eyelid / closed-eye art exists
- [ ] larger torso turns / new joints only with approved source-backed hidden-surface art

### Phase 2 performance contract
- hidden window: zero intentional animation frames
- reduced motion: no continuous decorative animation
- ambient target: <= 30 FPS
- renderer pixel ratio capped to avoid unnecessary Retina GPU cost
- stable NYX scene soft budget: <= 12 draw calls, <= 4400 triangles, <= 12 geometries, <= 12 textures, <= 14 ms render time
- enhanced NYX scene soft budget: <= 14 draw calls, <= 5200 triangles, <= 14 geometries, <= 14 textures, <= 18 ms render time
- render-time budget uses sustained violations; a single spike is not a failure
- performance telemetry must never silently disable motion or reduce visual fidelity to pass the budget

## Phase 3 — Assistant layer
### Status intelligence
- [x] deterministic local intelligence from normalized quota, forecast, provider freshness and active sessions
- [x] conservative routing headline based only on fresh quota headroom
- [x] depletion-before-reset and low-capacity escalation without fabricating provider limits
- [x] nearest future reset summary from provider-supplied reset timestamps
- [x] recent project concentration uses only recent request-level samples and never mixes Codex lifetime thread totals
- [x] Dashboard `System Brief` surface
- [x] Operator HUD consumes the same brief without owning monitoring or changing NYX motion/state semantics

### Local assistant
- [x] bounded local status-query intents for overall status, provider routing, next reset, active agents and recent project activity
- [x] English and common Traditional Chinese intent matching without a cloud LLM dependency
- [x] unsupported free-form questions degrade to explicit supported-intent help instead of fabricated answers
- [x] observed session closeouts after two consecutive fresh snapshots miss a previously active session
- [x] closeouts report provider/project/observed duration/last-seen metadata only; no prompt/code/transcript content or guessed token attribution
- [x] closeout state is bounded and in-memory only

### Notification personality
- [x] persisted System / NYX / Minimal notification-style setting
- [x] personality renderer changes wording only after deterministic alert facts are resolved
- [x] native macOS notification service applies the selected style without changing provider, threshold, reset timing, deduplication key or factual body data
- [x] notification-style UI disables with notifications and is covered by production-path regression tests

Voice/TTS feedback is intentionally out of scope. The assistant layer remains useful as a silent local command-center feature.

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
