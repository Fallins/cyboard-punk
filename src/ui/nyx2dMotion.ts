import type { OperatorRuntimeState } from './operatorRuntime';
import { NYX_2D_MOTION_ENVELOPES } from './nyx2dRig';

export interface Nyx2DHeadPose {
  x: number;
  y: number;
  rotationRad: number;
}

const DEG_TO_RAD = Math.PI / 180;

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
      return 0.92;
    case 'warning':
      return 0.72;
    case 'success':
      return 0.98;
    case 'idle':
      return 0.94;
    case 'offline':
    default:
      return 0;
  }
}

function stateBias(state: OperatorRuntimeState, t: number): Nyx2DHeadPose {
  const settle = smoothStep01(t / 0.65);

  switch (state) {
    case 'observing':
      return {
        // Keep provider attention primarily in gaze/roll rather than sliding the
        // hard head partition sideways across the collar.
        x: -0.0002 * settle,
        y: 0.00025 * settle,
        rotationRad: 0.14 * DEG_TO_RAD * settle,
      };
    case 'processing':
      return {
        x: 0,
        y: -0.00135 * settle,
        rotationRad: 0.06 * DEG_TO_RAD * settle,
      };
    case 'warning':
      return {
        x: 0,
        y: -0.00055 * settle,
        rotationRad: 0,
      };
    case 'success': {
      // One short acknowledgement after entering success, then return to the
      // ordinary living pose instead of looping a celebratory bob forever.
      const progress = Math.min(1, t / 1.15);
      const acknowledgement = progress < 1 ? Math.sin(progress * Math.PI) : 0;
      return {
        x: 0,
        y: -0.00165 * acknowledgement,
        rotationRad: -0.14 * DEG_TO_RAD * acknowledgement,
      };
    }
    case 'idle':
    case 'offline':
    default:
      return { x: 0, y: 0, rotationRad: 0 };
  }
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

  const t = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0) / 1000;
  const envelope = NYX_2D_MOTION_ENVELOPES.head;

  // Independent quicker periods keep the character alive, but horizontal
  // translation is now deliberately secondary. The collar should read as the
  // pivot while roll + tiny vertical travel carry most of the visible motion.
  const waveX = Math.sin(t * Math.PI * 2 * 0.13) * envelope.translateX * scale * 0.68;
  const waveY = Math.sin(t * Math.PI * 2 * 0.17) * envelope.translateY * scale * 0.68;
  const waveRotation =
    Math.sin(t * Math.PI * 2 * 0.115) * envelope.rotationDeg * scale * 0.90 * DEG_TO_RAD;
  const bias = stateBias(state, t);

  return {
    x: waveX + bias.x,
    y: waveY + bias.y,
    rotationRad: waveRotation + bias.rotationRad,
  };
}
