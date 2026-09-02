import type { OperatorRuntimeState } from './operatorRuntime';
import { NYX_2D_MOTION_ENVELOPES } from './nyx2dRig';

export interface Nyx2DBreathPose {
  translateY: number;
  scaleX: number;
  scaleY: number;
}

export function nyx2DBreathEnabled(value?: string): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on';
}

function stateScale(state: OperatorRuntimeState): number {
  switch (state) {
    case 'idle':
      return 0.9;
    case 'observing':
      return 0.74;
    case 'processing':
      return 0.62;
    case 'warning':
      return 0.42;
    case 'success':
      return 0.78;
    case 'offline':
    default:
      return 0;
  }
}

function stateFrequencyHz(state: OperatorRuntimeState): number {
  switch (state) {
    case 'processing':
      return 0.14;
    case 'warning':
      return 0.16;
    case 'success':
      return 0.18;
    case 'observing':
      return 0.17;
    case 'idle':
    default:
      return 0.155;
  }
}

export function nyx2DShouldAnimateBreath(
  state: OperatorRuntimeState,
  active: boolean,
  reducedMotion: boolean,
  featureEnabled: boolean,
): boolean {
  return featureEnabled && active && !reducedMotion && stateScale(state) > 0;
}

export function nyx2DBreathPoseAtTime(state: OperatorRuntimeState, elapsedMs: number): Nyx2DBreathPose {
  const scale = stateScale(state);
  if (scale <= 0) return { translateY: 0, scaleX: 1, scaleY: 1 };

  const t = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0) / 1000;
  const phase = Math.sin(t * Math.PI * 2 * stateFrequencyHz(state));
  const envelope = NYX_2D_MOTION_ENVELOPES.torsoBreath;

  return {
    translateY: phase * envelope.translateY * scale,
    scaleX: 1 + phase * envelope.scaleX * scale,
    scaleY: 1 + phase * envelope.scaleY * scale,
  };
}
