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
 * Soft runtime targets for the production articulated 2.5D operator. The body
 * mesh is 24x40 segments (1025 vertices / 1920 triangles) so shoulder caps and
 * upper arms can deform locally, while the only extra limb drawables remain the
 * two source-alpha forearm planes. These remain diagnostics only; exceeding a
 * budget never silently disables character motion or degrades visual fidelity.
 */
export const NYX_2D_STABLE_PERFORMANCE_BUDGET: Nyx2DPerformanceBudget = {
  maxDrawCalls: 12,
  maxTriangles: 2400,
  maxGeometries: 12,
  maxTextures: 12,
  maxRenderMs: 14,
};

export const NYX_2D_ENHANCED_PERFORMANCE_BUDGET: Nyx2DPerformanceBudget = {
  maxDrawCalls: 14,
  maxTriangles: 2800,
  maxGeometries: 14,
  maxTextures: 14,
  maxRenderMs: 18,
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
