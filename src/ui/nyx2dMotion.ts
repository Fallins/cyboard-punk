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

  // Start from exact neutral, then use shorter independent periods. Translation
  // is intentionally restrained so the hard head/body partition does not read
  // like a cut-out sliding across the collar; neck-pivot roll carries more of the
  // visible life signal.
  const x = Math.sin(t * Math.PI * 2 * 0.13) * envelope.translateX * scale * 0.82;
  const y = Math.sin(t * Math.PI * 2 * 0.17) * envelope.translateY * scale * 0.68;
  const rotationRad =
    Math.sin(t * Math.PI * 2 * 0.115) * envelope.rotationDeg * scale * 0.90 * DEG_TO_RAD;

  return { x, y, rotationRad };
}
