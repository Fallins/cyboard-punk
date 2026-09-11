# CYBOARD Agent Guide

## Mission
Build a local-first, performant macOS command center for AI coding agents. The monitoring core must remain useful independently of the Operator. The current production Operator remains 2D and consumes normalized semantic state without owning provider monitoring.

Character redesign and visual R&D are allowed only through the state-driven workflow in `docs/character-workflow/`. Experimental 2D, 2.5D, or 3D assets must stay isolated from the production Operator until the workflow reaches its Promotion Gate and the user explicitly approves integration.

## Non-negotiable rules
- TypeScript strict mode. No `any` at provider boundaries.
- Provider-specific code stays under `src/providers/<provider>` or `src-tauri/src/providers/<provider>` when introducing new provider modules; do not expand legacy monoliths without a focused migration plan.
- UI consumes normalized domain models only. Never leak raw provider payloads into components.
- Secrets are read only when required, held in memory for the shortest practical time, never logged, never persisted by CYBOARD, and never sent to telemetry.
- Prefer read-only local access. Do not mutate Cursor/Claude/Codex credentials or state during monitoring.
- Provider-source metadata may contain only stable non-secret provenance identifiers; never tokens, cookies, account IDs, credential paths/contents, or raw payload fragments.
- Every bug fix needs a regression test when practical. Every parser needs fixture tests for valid, partial, malformed, stale, and provider-changed payloads.
- Background polling must be adaptive, cancellable, deduplicated, and back off on errors/429s.
- UI animations must honor `prefers-reduced-motion` and pause when hidden.
- The existing NYX 3D/GLB production path remains retired. Do not restore a runtime 3D/GLB path merely because an experimental character is 3D. A runtime architecture change requires an explicit Promotion Gate decision and user approval.
- The currently approved NYX source, source lock, rig, and production renderer are protected baseline assets. Character exploration must not overwrite them.
- NYX production stays persistently mounted; state/provider-attention changes must not remount it or restart the breathing clock.

## Development flow
1. Read `docs/architecture.md`, `docs/testing.md`, `docs/performance.md`, and the relevant provider contract.
2. For any Operator/character visual work, also read `docs/character-workflow/README.md` and every source-of-truth file it requires before changing assets or renderer code.
3. Add or update tests first for parser/domain behavior.
4. Implement the smallest change that satisfies the contract.
5. Run `bun run check` and Rust tests before considering a batch validated.
6. Commit messages are English imperative conventional commits.

## Character workflow safety
- Chat history and model memory are not authoritative project state.
- `docs/character-workflow/04_WORK_STATE.md` is the resumable state pointer.
- A stage may not advance until its gate in `03_ACCEPTANCE_CRITERIA.md` passes.
- Passed/frozen regions may not be casually regenerated.
- Every stage boundary must produce a copy-ready next-chat prompt from `06_STAGE_HANDOFFS.md`.
- Exploration assets must be additive. Never replace current production assets until the Promotion Gate explicitly authorizes it.

## Versioning
`package.json` is the product version source. During `0.x`:
- feature: bump minor
- fix/polish: bump patch
- docs/rules only: no bump
Do not create tags/releases unless explicitly requested.

## Style
Formatting intentionally matches `Fallins/omnibrain-core`: 2 spaces, single quotes, semicolons, trailing commas, 120-column print width. Favor small pure functions, explicit result types, immutable normalized snapshots, dependency injection for clocks/transports/filesystem in testable logic, and comments only for non-obvious constraints.
