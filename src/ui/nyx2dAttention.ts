import type {
  OperatorProviderPanel,
  OperatorRuntimeState,
} from './operatorRuntime';

export type Nyx2DAttentionTarget = 'center' | 'codex' | 'claude' | 'cursor';
export type Nyx2DAttentionSide = -1 | 0 | 1;

const SUPPORTED_TARGETS = new Set<Nyx2DAttentionTarget>(['codex', 'claude', 'cursor']);

// Head attention responds faster than the arm/torso chain, but both are
// persistent filters rather than restartable finite animations. Retargeting
// mid-motion therefore preserves the current position instead of introducing a
// tiny zero-velocity pause or a provider-side pose jump.
export const NYX_2D_HEAD_ATTENTION_RESPONSE_MS = 280;
export const NYX_2D_BODY_ATTENTION_RESPONSE_MS = 720;

let runtimeAttentionTarget: Nyx2DAttentionTarget = 'center';
let runtimeAttentionRevision = 0;
let runtimeHeadBiasX = 0;
let runtimeHeadBiasY = 0;
let runtimeHeadBiasRotationDeg = 0;
let runtimeHeadBiasSampleAt = 0;
let runtimeBodySideMix = 0;
let runtimeBodySideSampleAt = 0;

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
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

function dampingAmount(dtMs: number, responseMs: number): number {
  const safeDt = Math.max(0, Math.min(100, dtMs));
  const tauMs = responseMs / 3;
  return safeDt > 0 ? 1 - Math.exp(-safeDt / tauMs) : 0;
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
 * Shared live target for coordinated channels. Changing attention never changes
 * renderer lifecycle; channels read the revision/target and preserve their own
 * continuous filtered state.
 */
export function setNyx2DRuntimeAttentionTarget(
  target: Nyx2DAttentionTarget,
): Nyx2DAttentionTarget {
  if (target === runtimeAttentionTarget) return runtimeAttentionTarget;
  runtimeAttentionTarget = target;
  runtimeAttentionRevision += 1;
  return runtimeAttentionTarget;
}

export function resetNyx2DRuntimeAttentionTarget(): void {
  runtimeAttentionTarget = 'center';
  runtimeAttentionRevision = 0;
  runtimeHeadBiasX = 0;
  runtimeHeadBiasY = 0;
  runtimeHeadBiasRotationDeg = 0;
  runtimeHeadBiasSampleAt = 0;
  runtimeBodySideMix = 0;
  runtimeBodySideSampleAt = 0;
}

export function nyx2DRuntimeAttentionTarget(): Nyx2DAttentionTarget {
  return runtimeAttentionTarget;
}

export function nyx2DRuntimeAttentionRevision(): number {
  return runtimeAttentionRevision;
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
 * Continuous -1..1 provider-side mix for upper-body articulation. A left→right
 * retarget crosses the current center pose instead of swapping limb ownership in
 * one frame. The filter never participates in renderer start/stop decisions.
 */
export function nyx2DRuntimeAttentionSideMix(
  currentTime = nowMs(),
): number {
  const safeTime = Math.max(0, Number.isFinite(currentTime) ? currentTime : nowMs());
  const desired = nyx2DAttentionSide(runtimeAttentionTarget);

  if (runtimeBodySideSampleAt <= 0) {
    runtimeBodySideSampleAt = safeTime;
    return runtimeBodySideMix;
  }

  const amount = dampingAmount(
    safeTime - runtimeBodySideSampleAt,
    NYX_2D_BODY_ATTENTION_RESPONSE_MS,
  );
  runtimeBodySideSampleAt = safeTime;
  runtimeBodySideMix += (desired - runtimeBodySideMix) * amount;
  if (Math.abs(desired - runtimeBodySideMix) < 0.0001) runtimeBodySideMix = desired;
  return runtimeBodySideMix;
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
  const safeTime = Math.max(0, Number.isFinite(currentTime) ? currentTime : nowMs());
  const desired = nyx2DHeadAttentionBias(state, runtimeAttentionTarget);

  if (runtimeHeadBiasSampleAt <= 0) {
    runtimeHeadBiasSampleAt = safeTime;
    return {
      x: runtimeHeadBiasX,
      y: runtimeHeadBiasY,
      rotationDeg: runtimeHeadBiasRotationDeg,
    };
  }

  const amount = dampingAmount(
    safeTime - runtimeHeadBiasSampleAt,
    NYX_2D_HEAD_ATTENTION_RESPONSE_MS,
  );
  runtimeHeadBiasSampleAt = safeTime;

  runtimeHeadBiasX += (desired.x - runtimeHeadBiasX) * amount;
  runtimeHeadBiasY += (desired.y - runtimeHeadBiasY) * amount;
  runtimeHeadBiasRotationDeg +=
    (desired.rotationDeg - runtimeHeadBiasRotationDeg) * amount;

  return {
    x: runtimeHeadBiasX,
    y: runtimeHeadBiasY,
    rotationDeg: runtimeHeadBiasRotationDeg,
  };
}
