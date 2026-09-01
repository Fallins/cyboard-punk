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
- default visible target: 30 FPS is acceptable for ambient operator; 60 FPS is unnecessary for the current non-interactive character
- operator model compressed; initial target GLB/VRM <= 8 MB, textures <= 2K, <= 80k visible triangles
- idle operator GPU load must stay modest; post-processing limited to one lightweight bloom/glow pass if needed
- reduced-motion mode does not create a WebGL renderer; it uses a static poster when available and the CSS operator otherwise
- no continuous physics simulation

## Adaptive renderer quality

The operator renderer starts in a high profile:

| Profile | DPR cap | Target FPS |
| --- | ---: | ---: |
| `high` | 1.5 | 30 |
| `balanced` | 1.0 | 30 |
| `low` | 1.0 | 20 |

The renderer measures its own render cost rather than using requestAnimationFrame interval as a proxy. A bounded 60-render sample window drives a conservative quality governor:

- sustained average render cost above 12 ms: `high -> balanced`;
- sustained average render cost above 20 ms while balanced: `balanced -> low`;
- sustained cheap renders below 10 ms: `low -> balanced`;
- sustained cheap renders below 7 ms while balanced: `balanced -> high`.

This ordering intentionally reduces Retina pixel work before sacrificing animation cadence.

The WebGL host exposes development-friendly `data-*` instrumentation without sending telemetry anywhere:

- `data-quality`
- `data-target-fps`
- `data-render-ms`
- `data-average-render-ms`
- `data-draw-calls`
- `data-triangles`
- `data-geometries`
- `data-textures`
- `data-asset=procedural|glb`

These values are local DOM diagnostics only.

## Techniques
- normalize/aggregate data in Rust before IPC
- incremental file-tail parsing using byte offsets and mtime instead of rescanning entire JSONL histories
- per-provider cache with freshness metadata
- coalesced refresh promises/tasks
- exponential backoff + jitter
- Solid fine-grained signals instead of broad object churn
- charts receive pre-aggregated bounded series
- CSS transforms/opacity for HUD animation; avoid layout-triggering animation
- provider-linked Operator HUD panels remain DOM/CSS rather than WebGL textures
- dynamic import production GLTF loader only when a real model asset exists
- hidden windows cancel intentional animation frames

## Instrumentation
Development builds expose or retain local timing surfaces for app boot, popover open, provider refresh, file scan, IPC payload size, chart render, operator load and renderer frame time. Performance regressions above 20% should block release unless documented.
