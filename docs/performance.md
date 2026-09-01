# Performance Budgets

CYBOARD lives in the menu bar, so idle efficiency is a product feature.

## Phase 1 budgets
- idle app CPU average: < 1% on a modern Apple Silicon Mac after warm-up
- hidden background CPU target: < 0.3% average outside refresh windows
- idle memory target: < 120 MB RSS before 3D assets
- compact popover interactive: < 150 ms from click when cached data exists
- cached dashboard first meaningful render: < 300 ms
- provider refresh must never block the UI thread
- network requests: only provider-required calls; no telemetry by default
- bounded caches and history; no unbounded arrays or full-history reparsing on every refresh

## Phase 2 budgets
- 3D bundle/model lazy-loaded only when full dashboard needs it
- renderer suspended at 0 FPS when hidden; animation frame cancelled
- default visible target: 30 FPS is acceptable for ambient operator; 60 FPS only for direct interaction
- operator model compressed; initial target GLB/VRM <= 8 MB, textures <= 2K, <= 80k visible triangles
- idle operator GPU load must stay modest; post-processing limited to one lightweight bloom/glow pass if needed
- low-power/reduced-motion mode uses static/2D fallback
- no continuous physics simulation

## Techniques
- normalize/aggregate data in Rust before IPC
- incremental file-tail parsing using byte offsets and mtime instead of rescanning entire JSONL histories
- per-provider cache with freshness metadata
- coalesced refresh promises/tasks
- exponential backoff + jitter
- Solid fine-grained signals instead of broad object churn
- charts receive pre-aggregated bounded series
- CSS transforms/opacity for HUD animation; avoid layout-triggering animation
- dynamic import renderer/Three.js in Phase 2

## Instrumentation
Development builds expose timing marks for app boot, popover open, provider refresh, file scan, IPC payload size, chart render, operator load and renderer frame time. Performance regressions above 20% should block release unless documented.
