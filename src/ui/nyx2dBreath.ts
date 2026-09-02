import type { OperatorRuntimeState } from './operatorRuntime';
import { NYX_2D_MOTION_ENVELOPES } from './nyx2dRig';
import { clampNyx2DTuningValue, nyx2DRuntimeTuning } from './nyx2dTuning';

export interface Nyx2DBreathPose {
  translateY: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Torso breathing is part of the stable NYX 2D runtime now.
 * Undefined/empty values enable the approved default; explicit false-like values
 * remain available for QA, diagnostics, and emergency rollback.
 */
export function nyx2DBreathEnabled(value?: string): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return true;
  return normalized !== '0' && normalized !== 'false' && normalized !== 'off' && normalized !== 'no';
}

function smoothStep01(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function stateScale(state: OperatorRuntimeState): number {
  switch (state) {
    case 'idle':
      return 1.0;
    case 'observing':
      return 0.92;
    case 'processing':
      return 0.86;
    case 'warning':
      return 0.68;
    case 'success':
      return 0.96;
    case 'offline':
    default:
      return 0;
  }
}

function stateFrequencyHz(state: OperatorRuntimeState): number {
  switch (state) {
    case 'processing':
      return 0.18;
    case 'warning':
      return 0.23;
    case 'success':
      return 0.24;
    case 'observing':
      return 0.22;
    case 'idle':
    default:
      return 0.20;
  }
}

function breathingEnvelope(t: number, frequencyHz: number): number {
  const cycle = (t * frequencyHz) % 1;
  const inhaleEnd = 0.38;
  if (cycle < inhaleEnd) return smoothStep01(cycle / inhaleEnd);
  return 1 - smoothStep01((cycle - inhaleEnd) / (1 - inhaleEnd));
}

export function nyx2DShouldAnimateBreath(
  state: OperatorRuntimeState,
  active: boolean,
  reducedMotion: boolean,
  featureEnabled: boolean,
): boolean {
  return featureEnabled && active && !reducedMotion && stateScale(state) > 0;
}

export function nyx2DBreathPoseAtTime(
  state: OperatorRuntimeState,
  elapsedMs: number,
  intensity = nyx2DRuntimeTuning().breath,
): Nyx2DBreathPose {
  const scale = stateScale(state);
  const tuning = clampNyx2DTuningValue('breath', intensity);
  if (scale <= 0 || tuning <= 0) return { translateY: 0, scaleX: 1, scaleY: 1 };

  const t = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0) / 1000;
  const phase = breathingEnvelope(t, stateFrequencyHz(state));
  const envelope = NYX_2D_MOTION_ENVELOPES.torsoBreath;
  const amount = scale * tuning;

  return {
    translateY: phase * envelope.translateY * amount,
    scaleX: 1 + phase * envelope.scaleX * amount,
    scaleY: 1 + phase * envelope.scaleY * amount,
  };
}
