import type { OperatorRuntimeState } from './operatorRuntime';
import type { Nyx2DAttentionTarget } from './nyx2dAttention';

export interface Nyx2DGazeOffset {
  u: number;
  v: number;
}

// Eye motion is deliberately smaller than the earlier preview. At the dashboard
// hero size this reads as attention rather than as an independently sliding iris.
export const NYX_2D_GAZE_BOUNDS = {
  u: 0.0036,
  v: 0.0016,
} as const satisfies Readonly<Nyx2DGazeOffset>;

export function nyx2DGazeEnabled(value?: string): boolean {
  const normalized = value?.trim().toLowerCase();
  // Gaze graduated to the stable 2D profile in 0.14.0. Keep an explicit off
  // switch for visual A/B and emergency rollback.
  if (normalized === '0' || normalized === 'false' || normalized === 'off') return false;
  return true;
}

export function nyx2DShouldAnimateGaze(
  state: OperatorRuntimeState,
  active: boolean,
  reducedMotion: boolean,
  featureEnabled: boolean,
): boolean {
  return featureEnabled && active && !reducedMotion && state !== 'offline';
}

function smoothStep01(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function targetOffset(target: Nyx2DAttentionTarget): Nyx2DGazeOffset {
  const { u, v } = NYX_2D_GAZE_BOUNDS;
  switch (target) {
    case 'codex':
      return { u: -u * 0.78, v: v * 0.44 };
    case 'claude':
      return { u: -u * 0.78, v: -v * 0.40 };
    case 'cursor':
      return { u: u * 0.78, v: v * 0.44 };
    case 'center':
    default:
      return { u: 0, v: 0 };
  }
}

function stateScale(state: OperatorRuntimeState): number {
  switch (state) {
    case 'observing':
      return 1;
    case 'warning':
      return 0.92;
    case 'processing':
      return 0.74;
    case 'success':
      return 0.62;
    case 'idle':
      return 0.48;
    case 'offline':
    default:
      return 0;
  }
}

export function nyx2DGazeOffsetAtTime(
  state: OperatorRuntimeState,
  target: Nyx2DAttentionTarget,
  elapsedMs: number,
): Nyx2DGazeOffset {
  const scale = stateScale(state);
  if (scale <= 0 || target === 'center') return { u: 0, v: 0 };

  const t = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0) / 1000;
  // A directed attention change should arrive calmly. Runtime damping handles
  // later provider changes; this ramp protects the initial renderer startup.
  const settle = smoothStep01(t / 0.48);
  const targetBias = targetOffset(target);

  return {
    u: targetBias.u * scale * settle,
    v: targetBias.v * scale * settle,
  };
}

export function nyx2DGazeBounds(): Readonly<Nyx2DGazeOffset> {
  return NYX_2D_GAZE_BOUNDS;
}
