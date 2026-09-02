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
