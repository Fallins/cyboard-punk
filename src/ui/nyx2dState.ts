import type { OperatorRuntimeState } from './operatorRuntime';

export function nyx2DEmissiveIntensity(state: OperatorRuntimeState): number {
  switch (state) {
    case 'processing':
      return 0.34;
    case 'warning':
      return 0.48;
    case 'success':
      return 0.58;
    case 'observing':
      return 0.24;
    case 'offline':
      return 0.05;
    case 'idle':
    default:
      return 0.16;
  }
}

export function nyx2DEmissivePulseAmplitude(state: OperatorRuntimeState): number {
  switch (state) {
    case 'processing':
      return 0.055;
    case 'warning':
      return 0.075;
    case 'success':
      return 0.11;
    case 'observing':
      return 0.035;
    case 'idle':
      return 0.025;
    case 'offline':
    default:
      return 0;
  }
}

export function nyx2DEmissivePulseHz(state: OperatorRuntimeState): number {
  switch (state) {
    case 'processing':
      return 0.72;
    case 'warning':
      return 1.05;
    case 'success':
      return 1.25;
    case 'observing':
      return 0.52;
    case 'idle':
      return 0.34;
    case 'offline':
    default:
      return 0;
  }
}

export function nyx2DShouldAnimateEffects(
  state: OperatorRuntimeState,
  active: boolean,
  reducedMotion: boolean,
): boolean {
  return active && !reducedMotion && nyx2DEmissivePulseAmplitude(state) > 0;
}
