import type {
  OperatorProviderPanel,
  OperatorRuntimeState,
} from './operatorRuntime';

export type Nyx2DAttentionTarget = 'center' | 'codex' | 'claude' | 'cursor';
export type Nyx2DAttentionSide = -1 | 0 | 1;

export interface Nyx2DAttentionTransition {
  from: Nyx2DAttentionTarget;
  target: Nyx2DAttentionTarget;
  progress: number;
}

const SUPPORTED_TARGETS = new Set<Nyx2DAttentionTarget>(['codex', 'claude', 'cursor']);
export const NYX_2D_ATTENTION_TRANSITION_MS = 720;

let runtimeAttentionFrom: Nyx2DAttentionTarget = 'center';
let runtimeAttentionTarget: Nyx2DAttentionTarget = 'center';
let runtimeAttentionChangedAt = 0;

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function smoothStep01(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function toTarget(panel?: OperatorProviderPanel): Nyx2DAttentionTarget {
  if (!panel) return 'center';
  return SUPPORTED_TARGETS.has(panel.provider as Nyx2DAttentionTarget)
    ? (panel.provider as Nyx2DAttentionTarget)
    : 'center';
}

function remainingRank(panel: OperatorProviderPanel): number {
  return panel.remainingPercent ?? Number.POSITIVE_INFINITY;
}

export function resolveNyx2DAttentionTarget(
  panels: readonly OperatorProviderPanel[],
): Nyx2DAttentionTarget {
  const warnings = panels
    .filter((panel) => panel.state === 'warning')
    .slice()
    .sort((a, b) => remainingRank(a) - remainingRank(b));
  if (warnings.length) return toTarget(warnings[0]);

  const active = panels.find((panel) => panel.state === 'active');
  if (active) return toTarget(active);

  return 'center';
}

/**
 * Shared live target for renderer channels that must remain coordinated without
 * making provider changes a renderer lifecycle dependency.
 */
export function setNyx2DRuntimeAttentionTarget(
  target: Nyx2DAttentionTarget,
  changedAt = nowMs(),
): Nyx2DAttentionTarget {
  if (target === runtimeAttentionTarget) return runtimeAttentionTarget;
  runtimeAttentionFrom = runtimeAttentionTarget;
  runtimeAttentionTarget = target;
  runtimeAttentionChangedAt = Math.max(0, Number.isFinite(changedAt) ? changedAt : nowMs());
  return runtimeAttentionTarget;
}

export function resetNyx2DRuntimeAttentionTarget(): void {
  runtimeAttentionFrom = 'center';
  runtimeAttentionTarget = 'center';
  runtimeAttentionChangedAt = 0;
}

export function nyx2DRuntimeAttentionTarget(): Nyx2DAttentionTarget {
  return runtimeAttentionTarget;
}

export function nyx2DRuntimeAttentionTransition(
  currentTime = nowMs(),
): Nyx2DAttentionTransition {
  if (runtimeAttentionFrom === runtimeAttentionTarget) {
    return { from: runtimeAttentionTarget, target: runtimeAttentionTarget, progress: 1 };
  }
  const elapsed = Math.max(0, currentTime - runtimeAttentionChangedAt);
  const progress = smoothStep01(elapsed / NYX_2D_ATTENTION_TRANSITION_MS);
  if (progress >= 1) runtimeAttentionFrom = runtimeAttentionTarget;
  return { from: runtimeAttentionFrom, target: runtimeAttentionTarget, progress };
}

/** Dashboard-side direction used by head, torso and semantic arm coordination. */
export function nyx2DAttentionSide(target: Nyx2DAttentionTarget): Nyx2DAttentionSide {
  switch (target) {
    case 'codex':
    case 'claude':
      return -1;
    case 'cursor':
      return 1;
    case 'center':
    default:
      return 0;
  }
}

/**
 * Source-safe head bias. The head/body split cannot support a true yaw, so
 * attention is expressed as a restrained lateral shift + neck-pivot rotation.
 * Values deliberately stay inside the existing head motion envelope.
 */
export function nyx2DAttentionBias(target: Nyx2DAttentionTarget): {
  x: number;
  y: number;
  rotationDeg: number;
} {
  switch (target) {
    case 'codex':
      return { x: -0.0015, y: 0.00065, rotationDeg: 0.62 };
    case 'claude':
      return { x: -0.0015, y: -0.00045, rotationDeg: 0.52 };
    case 'cursor':
      return { x: 0.0015, y: 0.00065, rotationDeg: -0.62 };
    case 'center':
    default:
      return { x: 0, y: 0, rotationDeg: 0 };
  }
}

function attentionStateScale(state: OperatorRuntimeState): number {
  switch (state) {
    case 'observing':
      return 1;
    case 'processing':
      return 0.92;
    case 'warning':
      return 0.86;
    case 'success':
      return 0.72;
    case 'idle':
      return 0.45;
    case 'offline':
    default:
      return 0;
  }
}

export function nyx2DHeadAttentionBias(
  state: OperatorRuntimeState,
  target: Nyx2DAttentionTarget,
): { x: number; y: number; rotationDeg: number } {
  const base = nyx2DAttentionBias(target);
  const scale = attentionStateScale(state);
  return {
    x: base.x * scale,
    y: base.y * scale,
    rotationDeg: base.rotationDeg * scale,
  };
}

export function nyx2DRuntimeHeadAttentionBias(
  state: OperatorRuntimeState,
  currentTime = nowMs(),
): { x: number; y: number; rotationDeg: number } {
  const transition = nyx2DRuntimeAttentionTransition(currentTime);
  const from = nyx2DHeadAttentionBias(state, transition.from);
  const to = nyx2DHeadAttentionBias(state, transition.target);
  return {
    x: from.x + (to.x - from.x) * transition.progress,
    y: from.y + (to.y - from.y) * transition.progress,
    rotationDeg:
      from.rotationDeg + (to.rotationDeg - from.rotationDeg) * transition.progress,
  };
}
