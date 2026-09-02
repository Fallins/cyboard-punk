import type { OperatorRuntimeState } from './operatorRuntime';
import type { Nyx2DAttentionTarget } from './nyx2dAttention';

export interface Nyx2DGazeOffset {
  u: number;
  v: number;
}

const MAX_U = 0.0062;
const MAX_V = 0.0028;

export function nyx2DGazeEnabled(value?: string): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on';
}

function smoothStep01(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function targetOffset(target: Nyx2DAttentionTarget): Nyx2DGazeOffset {
  switch (target) {
    case 'codex':
      return { u: -MAX_U * 0.82, v: MAX_V * 0.52 };
    case 'claude':
      return { u: -MAX_U * 0.82, v: -MAX_V * 0.48 };
    case 'cursor':
      return { u: MAX_U * 0.82, v: MAX_V * 0.52 };
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
      return 0.96;
    case 'processing':
      return 0.76;
    case 'success':
      return 0.70;
    case 'idle':
      return 0.55;
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
  if (scale <= 0) return { u: 0, v: 0 };

  const t = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0) / 1000;
  const settle = smoothStep01(t / 0.34);
  const targetBias = targetOffset(target);

  if (target !== 'center') {
    return {
      u: targetBias.u * scale * settle,
      v: targetBias.v * scale * settle,
    };
  }

  // Center attention still has tiny deterministic eye wandering, but it uses
  // separate periods and a much smaller envelope than provider-directed gaze.
  return {
    u: Math.sin(t * Math.PI * 2 * 0.31) * MAX_U * scale * 0.28,
    v: Math.sin(t * Math.PI * 2 * 0.23) * MAX_V * scale * 0.22,
  };
}

export function nyx2DGazeBounds(): Readonly<Nyx2DGazeOffset> {
  return { u: MAX_U, v: MAX_V };
}
