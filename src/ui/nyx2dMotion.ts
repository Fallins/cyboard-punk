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

function stateScale(state: OperatorRuntimeState): number {
  switch (state) {
    case 'observing':
      return 0.78;
    case 'processing':
      return 0.46;
    case 'warning':
      return 0.34;
    case 'success':
      return 0.60;
    case 'idle':
      return 0.52;
    case 'offline':
    default:
      return 0;
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

  // All channels begin at exact neutral pose (t=0 => 0), so mount/resume/state
  // transitions cannot create a visible snap. Different long periods prevent the
  // channels from moving in lockstep after that neutral frame.
  const x = Math.sin(t * Math.PI * 2 * 0.071) * envelope.translateX * scale * 0.56;
  const y = Math.sin(t * Math.PI * 2 * 0.053) * envelope.translateY * scale * 0.42;
  const rotationRad =
    Math.sin(t * Math.PI * 2 * 0.061) * envelope.rotationDeg * scale * 0.52 * DEG_TO_RAD;

  return { x, y, rotationRad };
}
