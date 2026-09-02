export interface Nyx2DPerformanceSnapshot {
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  renderMs: number;
}

export interface Nyx2DPerformanceBudget {
  maxDrawCalls: number;
  maxTriangles: number;
  maxGeometries: number;
  maxTextures: number;
  maxRenderMs: number;
}

/**
 * Soft runtime targets for the stable 2D operator. These are diagnostics, not
 * reasons to degrade NYX visual fidelity automatically.
 */
export const NYX_2D_STABLE_PERFORMANCE_BUDGET: Nyx2DPerformanceBudget = {
  maxDrawCalls: 8,
  maxTriangles: 2200,
  maxGeometries: 8,
  maxTextures: 8,
  // 24/30 FPS leaves ample frame budget. Rendering itself should stay far below
  // that so the rest of CYBOARD remains responsive on ordinary Macs.
  maxRenderMs: 12,
};

export const NYX_2D_ENHANCED_PERFORMANCE_BUDGET: Nyx2DPerformanceBudget = {
  maxDrawCalls: 12,
  maxTriangles: 2600,
  maxGeometries: 10,
  maxTextures: 10,
  maxRenderMs: 16,
};

export interface Nyx2DPerformanceEvaluation {
  ok: boolean;
  violations: string[];
}

export function evaluateNyx2DPerformance(
  snapshot: Nyx2DPerformanceSnapshot,
  budget: Nyx2DPerformanceBudget,
): Nyx2DPerformanceEvaluation {
  const violations: string[] = [];

  if (snapshot.drawCalls > budget.maxDrawCalls) {
    violations.push(`drawCalls ${snapshot.drawCalls} > ${budget.maxDrawCalls}`);
  }
  if (snapshot.triangles > budget.maxTriangles) {
    violations.push(`triangles ${snapshot.triangles} > ${budget.maxTriangles}`);
  }
  if (snapshot.geometries > budget.maxGeometries) {
    violations.push(`geometries ${snapshot.geometries} > ${budget.maxGeometries}`);
  }
  if (snapshot.textures > budget.maxTextures) {
    violations.push(`textures ${snapshot.textures} > ${budget.maxTextures}`);
  }
  if (snapshot.renderMs > budget.maxRenderMs) {
    violations.push(`renderMs ${snapshot.renderMs.toFixed(2)} > ${budget.maxRenderMs}`);
  }

  return { ok: violations.length === 0, violations };
}

export interface Nyx2DPerformanceGuardState {
  consecutiveViolations: number;
  warning: boolean;
  violations: string[];
}

export const NYX_2D_PERFORMANCE_WARNING_THRESHOLD = 5;

export function createNyx2DPerformanceGuardState(): Nyx2DPerformanceGuardState {
  return { consecutiveViolations: 0, warning: false, violations: [] };
}

export function resetNyx2DPerformanceGuard(
  state: Nyx2DPerformanceGuardState,
): Nyx2DPerformanceGuardState {
  state.consecutiveViolations = 0;
  state.warning = false;
  state.violations = [];
  return state;
}

/**
 * A single slow render is not actionable. Require sustained violations before
 * exposing a runtime warning; one healthy sample clears the streak immediately.
 */
export function sampleNyx2DPerformanceGuard(
  state: Nyx2DPerformanceGuardState,
  snapshot: Nyx2DPerformanceSnapshot,
  budget: Nyx2DPerformanceBudget,
  threshold = NYX_2D_PERFORMANCE_WARNING_THRESHOLD,
): Nyx2DPerformanceGuardState {
  const evaluation = evaluateNyx2DPerformance(snapshot, budget);
  if (evaluation.ok) return resetNyx2DPerformanceGuard(state);

  state.consecutiveViolations += 1;
  state.warning = state.consecutiveViolations >= Math.max(1, threshold);
  state.violations = evaluation.violations;
  return state;
}
