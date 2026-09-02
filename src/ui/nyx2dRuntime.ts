import type { OperatorRuntimeState } from './operatorRuntime';
import {
  nyx2DEmissiveIntensity,
  nyx2DEmissivePulseAmplitude,
  nyx2DEmissivePulseHz,
} from './nyx2dState';

const TAU = Math.PI * 2;

export function nyx2DEmissiveAtTime(state: OperatorRuntimeState, elapsedMs: number): number {
  const base = nyx2DEmissiveIntensity(state);
  const amplitude = nyx2DEmissivePulseAmplitude(state);
  const hz = nyx2DEmissivePulseHz(state);
  if (amplitude <= 0 || hz <= 0) return base;

  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  // Smooth 0..1 pulse rather than -1..1 so the approved static state remains
  // the minimum brightness and animation only adds restrained energy.
  const phase = (Math.sin((safeElapsed / 1000) * TAU * hz - Math.PI / 2) + 1) * 0.5;
  return base + phase * amplitude;
}

export function nyx2DFrameIntervalMs(targetFps = 24): number {
  const safeFps = Number.isFinite(targetFps) ? Math.min(60, Math.max(1, targetFps)) : 24;
  return 1000 / safeFps;
}
