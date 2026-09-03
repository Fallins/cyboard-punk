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

/**
 * Breathing is intentionally state-independent for every live NYX state.
 * Semantic state changes must never jump the torso to another amplitude or
 * phase; only offline/reduced-motion/lifecycle boundaries may stop breathing.
 */
function stateScale(state: OperatorRuntimeState): number {
  return state === 'offline' ? 0 : 1;
}

const LIVE_BREATH_FREQUENCY_HZ = 0.20;

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
  const phase = breathingEnvelope(t, LIVE_BREATH_FREQUENCY_HZ);
  const envelope = NYX_2D_MOTION_ENVELOPES.torsoBreath;
  const amount = scale * tuning;

  return {
    translateY: phase * envelope.translateY * amount,
    scaleX: 1 + phase * envelope.scaleX * amount,
    scaleY: 1 + phase * envelope.scaleY * amount,
  };
}
