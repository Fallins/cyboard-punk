# CYBOARD Agent Guide

## Mission
Build a local-first, performant macOS command center for AI coding agents. Phase 1 must be useful without the 3D operator. Phase 2 adds the operator without making the monitoring core dependent on rendering.

## Non-negotiable rules
- TypeScript strict mode. No `any` at provider boundaries.
- Provider-specific code stays under `src/providers/<provider>` or `src-tauri/src/providers/<provider>`.
- UI consumes normalized domain models only. Never leak raw provider payloads into components.
- Secrets are read only when required, held in memory for the shortest practical time, never logged, never persisted by CYBOARD, and never sent to telemetry.
- Prefer read-only local access. Do not mutate Cursor/Claude/Codex credentials or state in Phase 1.
- Every bug fix needs a regression test when practical. Every parser needs fixture tests for valid, partial, malformed, stale, and provider-changed payloads.
- Background polling must be adaptive, cancellable, deduplicated, and back off on errors/429s.
- UI animations must honor `prefers-reduced-motion` and pause when hidden.
- 3D assets are optional/lazy. Core monitoring must remain fully functional if WebGL is unavailable.

## Development flow
1. Read `docs/architecture.md`, `docs/testing.md`, `docs/performance.md`, and the relevant provider contract.
2. Add or update tests first for parser/domain behavior.
3. Implement the smallest change that satisfies the contract.
4. Run `bun run check` and Rust tests before merging.
5. Commit messages are English imperative conventional commits.

## Versioning
`package.json` is the product version source. During `0.x`:
- feature: bump minor
- fix/polish: bump patch
- docs/rules only: no bump
Do not create tags/releases unless explicitly requested.

## Style
Formatting intentionally matches `Fallins/omnibrain-core`: 2 spaces, single quotes, semicolons, trailing commas, 120-column print width. Favor small pure functions, explicit result types, immutable normalized snapshots, dependency injection for clocks/transports/filesystem in testable logic, and comments only for non-obvious constraints.
