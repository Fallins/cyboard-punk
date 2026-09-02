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

export function nyx2DHeadMotionEnabled(value?: string): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on';
}

function smoothStep01(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function stateScale(state: OperatorRuntimeState): number {
  switch (state) {
    case 'observing':
      return 1.0;
    case 'processing':
      return 0.86;
    case 'warning':
      return 0.62;
    case 'success':
      return 0.92;
    case 'idle':
      return 0.82;
    case 'offline':
    default:
      return 0;
  }
}

function stateBias(state: OperatorRuntimeState, t: number): Nyx2DHeadPose {
  const settle = smoothStep01(t / 0.8);

  switch (state) {
    case 'observing':
      return {
        x: -0.00008 * settle,
        y: 0,
        rotationRad: 0.12 * DEG_TO_RAD * settle,
      };
    case 'processing':
      return {
        x: 0,
        y: -0.00035 * settle,
        rotationRad: 0.05 * DEG_TO_RAD * settle,
      };
    case 'warning':
      return {
        x: 0,
        y: -0.00015 * settle,
        rotationRad: 0,
      };
    case 'success': {
      const progress = Math.min(1, t / 1.05);
      const acknowledgement = progress < 1 ? Math.sin(progress * Math.PI) : 0;
      return {
        x: 0,
        y: -0.0007 * acknowledgement,
        rotationRad: -0.12 * DEG_TO_RAD * acknowledgement,
      };
    }
    case 'idle':
    case 'offline':
    default:
      return { x: 0, y: 0, rotationRad: 0 };
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
    // Horizontal travel is intentionally tiny: the neck/collar seam must read as
    // an anchor, not as a sliding cutout.
    x: direction * envelope.translateX * scale * 0.11 * variation,
    // Autonomous vertical travel is nearly zero. The shared breathing phase below
    // carries the neck anchor vertically with the torso instead.
    y: -envelope.translateY * scale * 0.035 * variation,
    rotationRad:
      direction * envelope.rotationDeg * scale * 0.58 * variation * DEG_TO_RAD,
  };
}

function postureCycleAtTime(t: number, scale: number): Nyx2DHeadPose {
  // Human idle posture is not a perpetual oscillator. Each deterministic cycle
  // spends most of its time still, makes one small adjustment, holds it, then
  // settles back to neutral.
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
  const bias = stateBias(state, t);
  const breath = nyx2DBreathPoseAtTime(state, safeElapsedMs);

  return {
    x: posture.x + bias.x,
    y: posture.y + bias.y + breath.translateY * BREATH_ANCHOR_INHERITANCE,
    rotationRad: posture.rotationRad + bias.rotationRad,
  };
}
