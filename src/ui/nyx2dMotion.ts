import type { OperatorRuntimeState } from './operatorRuntime';
import { nyx2DBreathPoseAtTime } from './nyx2dBreath';
import { NYX_2D_MOTION_ENVELOPES } from './nyx2dRig';

export interface Nyx2DHeadPose {
  x: number;
  y: number;
  rotationRad: number;
}

const DEG_TO_RAD = Math.PI / 180;
const BREATH_ANCHOR_INHERITANCE = 0.58;

/**
 * Head posture is part of the stable NYX 2D runtime now.
 *
 * Undefined/empty values mean "use the stable default" => enabled.
 * Explicit 0/false/off/no are kept as an emergency/QA opt-out.
 */
export function nyx2DHeadMotionEnabled(value?: string): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return true;
  return normalized !== '0' && normalized !== 'false' && normalized !== 'off' && normalized !== 'no';
}

function smoothStep01(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/**
 * Continuous posture activity is deliberately state-specific. The old values
 * were all close enough that a held observing/processing/warning/success state
 * read like the same idle loop after its sub-second entry gesture ended.
 *
 * Observing stays most alert; processing is focused and quieter; warning braces
 * almost still; success relaxes without returning all the way to idle cadence.
 */
function stateScale(state: OperatorRuntimeState): number {
  switch (state) {
    case 'observing':
      return 1.0;
    case 'processing':
      return 0.58;
    case 'warning':
      return 0.36;
    case 'success':
      return 0.76;
    case 'idle':
      return 0.72;
    case 'offline':
    default:
      return 0;
  }
}

interface PostureCycle {
  x: number;
  y: number;
  rotationRad: number;
}

function postureTarget(cycleIndex: number, scale: number): PostureCycle {
  const envelope = NYX_2D_MOTION_ENVELOPES.head;
  const direction = cycleIndex % 2 === 0 ? 1 : -1;
  const variation = cycleIndex % 3 === 0 ? 0.82 : cycleIndex % 3 === 1 ? 1 : 0.9;

  return {
    x: direction * envelope.translateX * scale * 0.11 * variation,
    y: -envelope.translateY * scale * 0.035 * variation,
    rotationRad:
      direction * envelope.rotationDeg * scale * 0.58 * variation * DEG_TO_RAD,
  };
}

function postureCycleAtTime(t: number, scale: number): Nyx2DHeadPose {
  const cycleDuration = 8.8;
  const cycleIndex = Math.floor(t / cycleDuration);
  const local = t - cycleIndex * cycleDuration;
  const target = postureTarget(cycleIndex, scale);

  const adjustStart = 2.0;
  const adjustEnd = 3.05;
  const holdEnd = 4.85;
  const settleEnd = 5.8;

  let amount = 0;
  if (local >= adjustStart && local < adjustEnd) {
    amount = smoothStep01((local - adjustStart) / (adjustEnd - adjustStart));
  } else if (local >= adjustEnd && local < holdEnd) {
    amount = 1;
  } else if (local >= holdEnd && local < settleEnd) {
    amount = 1 - smoothStep01((local - holdEnd) / (settleEnd - holdEnd));
  }

  return {
    x: target.x * amount,
    y: target.y * amount,
    rotationRad: target.rotationRad * amount,
  };
}

export function nyx2DShouldAnimateHead(
  state: OperatorRuntimeState,
  active: boolean,
  reducedMotion: boolean,
  featureEnabled: boolean,
): boolean {
  return featureEnabled && active && !reducedMotion && stateScale(state) > 0;
}

export function nyx2DHeadPoseAtTime(state: OperatorRuntimeState, elapsedMs: number): Nyx2DHeadPose {
  const scale = stateScale(state);
  if (scale <= 0) return { x: 0, y: 0, rotationRad: 0 };

  const safeElapsedMs = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const t = safeElapsedMs / 1000;
  const posture = postureCycleAtTime(t, scale);
  const breath = nyx2DBreathPoseAtTime(state, safeElapsedMs);

  // State-entry acknowledgements intentionally live outside this continuous
  // posture clock. This keeps live-state continuity intact and guarantees that
  // entering success/warning later in a session still receives exactly one
  // reaction instead of depending on the renderer's global elapsed time.
  return {
    x: posture.x,
    y: posture.y + breath.translateY * BREATH_ANCHOR_INHERITANCE,
    rotationRad: posture.rotationRad,
  };
}
