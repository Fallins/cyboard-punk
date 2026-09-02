import { describe, expect, it } from 'vitest';
import {
  createNyx2DPerformanceGuardState,
  evaluateNyx2DPerformance,
  NYX_2D_ENHANCED_PERFORMANCE_BUDGET,
  NYX_2D_PERFORMANCE_WARNING_THRESHOLD,
  NYX_2D_STABLE_PERFORMANCE_BUDGET,
  resetNyx2DPerformanceGuard,
  sampleNyx2DPerformanceGuard,
} from './nyx2dPerformance';

describe('NYX 2D performance guardrails', () => {
  it('accepts a healthy stable renderer snapshot', () => {
    const result = evaluateNyx2DPerformance(
      {
        drawCalls: 4,
        triangles: 420,
        geometries: 3,
        textures: 4,
        renderMs: 2.4,
      },
      NYX_2D_STABLE_PERFORMANCE_BUDGET,
    );

    expect(result).toEqual({ ok: true, violations: [] });
  });

  it('reports every exceeded budget instead of hiding the first one', () => {
    const result = evaluateNyx2DPerformance(
      {
        drawCalls: 20,
        triangles: 9999,
        geometries: 30,
        textures: 20,
        renderMs: 40,
      },
      NYX_2D_STABLE_PERFORMANCE_BUDGET,
    );

    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(5);
  });

  it('allows the enhanced profile slightly more headroom without weakening stable targets', () => {
    expect(NYX_2D_ENHANCED_PERFORMANCE_BUDGET.maxDrawCalls).toBeGreaterThan(
      NYX_2D_STABLE_PERFORMANCE_BUDGET.maxDrawCalls,
    );
    expect(NYX_2D_ENHANCED_PERFORMANCE_BUDGET.maxRenderMs).toBeGreaterThan(
      NYX_2D_STABLE_PERFORMANCE_BUDGET.maxRenderMs,
    );
  });

  it('does not warn on a single transient spike', () => {
    const state = createNyx2DPerformanceGuardState();
    sampleNyx2DPerformanceGuard(
      state,
      { drawCalls: 4, triangles: 420, geometries: 3, textures: 4, renderMs: 30 },
      NYX_2D_STABLE_PERFORMANCE_BUDGET,
    );

    expect(state.consecutiveViolations).toBe(1);
    expect(state.warning).toBe(false);
  });

  it('warns only after sustained violations and clears immediately on recovery', () => {
    const state = createNyx2DPerformanceGuardState();
    const bad = { drawCalls: 14, triangles: 420, geometries: 3, textures: 4, renderMs: 2.4 };

    for (let i = 0; i < NYX_2D_PERFORMANCE_WARNING_THRESHOLD - 1; i += 1) {
      sampleNyx2DPerformanceGuard(state, bad, NYX_2D_STABLE_PERFORMANCE_BUDGET);
      expect(state.warning).toBe(false);
    }

    sampleNyx2DPerformanceGuard(state, bad, NYX_2D_STABLE_PERFORMANCE_BUDGET);
    expect(state.warning).toBe(true);
    expect(state.violations.some((value) => value.startsWith('drawCalls'))).toBe(true);

    sampleNyx2DPerformanceGuard(
      state,
      { drawCalls: 4, triangles: 420, geometries: 3, textures: 4, renderMs: 2.4 },
      NYX_2D_STABLE_PERFORMANCE_BUDGET,
    );
    expect(state).toEqual({ consecutiveViolations: 0, warning: false, violations: [] });
  });

  it('clears stale performance history across suspension/static lifecycle boundaries', () => {
    const state = createNyx2DPerformanceGuardState();
    const bad = { drawCalls: 14, triangles: 420, geometries: 3, textures: 4, renderMs: 30 };
    for (let i = 0; i < NYX_2D_PERFORMANCE_WARNING_THRESHOLD; i += 1) {
      sampleNyx2DPerformanceGuard(state, bad, NYX_2D_STABLE_PERFORMANCE_BUDGET);
    }
    expect(state.warning).toBe(true);

    resetNyx2DPerformanceGuard(state);
    expect(state).toEqual({ consecutiveViolations: 0, warning: false, violations: [] });
  });
});
