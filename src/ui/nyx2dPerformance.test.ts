import { describe, expect, it } from 'vitest';
import {
  evaluateNyx2DPerformance,
  NYX_2D_ENHANCED_PERFORMANCE_BUDGET,
  NYX_2D_STABLE_PERFORMANCE_BUDGET,
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
});
