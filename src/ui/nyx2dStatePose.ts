import type { OperatorRuntimeState } from './operatorRuntime';
import { clampNyx2DTuningValue } from './nyx2dTuning';

export interface Nyx2DStateStance {
  translateXPx: number;
  translateYPx: number;
  rotationDeg: number;
  scaleX: number;
  scaleY: number;
}

const NEUTRAL: Nyx2DStateStance = {
  translateXPx: 0,
  translateYPx: 0,
  rotationDeg: 0,
  scaleX: 1,
  scaleY: 1,
};

/**
 * Sustained, whole-operator stance signatures.
 *
 * These are intentionally applied outside the internal head/body rig. That keeps
 * the approved neck partition intact while making a held runtime state readable
 * after the short entry acknowledgement has finished.
 */
const STATE_STANCES: Record<OperatorRuntimeState, Nyx2DStateStance> = {
  idle: NEUTRAL,
  observing: {
    translateXPx: 0.8,
    translateYPx: -1.8,
    rotationDeg: -0.18,
    scaleX: 1.001,
    scaleY: 1.001,
  },
  processing: {
    translateXPx: -0.4,
    translateYPx: 1.4,
    rotationDeg: 0.14,
    scaleX: 0.999,
    scaleY: 0.9975,
  },
  warning: {
    translateXPx: 0,
    translateYPx: -0.8,
    rotationDeg: 0,
    scaleX: 1.006,
    scaleY: 0.999,
  },
  success: {
    translateXPx: 0,
    translateYPx: -2.4,
    rotationDeg: -0.06,
    scaleX: 1.0035,
    scaleY: 1.0035,
  },
  offline: NEUTRAL,
};

export function nyx2DStateStance(state: OperatorRuntimeState): Nyx2DStateStance {
  return STATE_STANCES[state];
}

export function nyx2DStateStanceTransform(state: OperatorRuntimeState, intensity = 1): string {
  const stance = nyx2DStateStance(state);
  const scale = clampNyx2DTuningValue('stance', intensity);
  const scaleX = 1 + (stance.scaleX - 1) * scale;
  const scaleY = 1 + (stance.scaleY - 1) * scale;
  return `translate3d(${stance.translateXPx * scale}px, ${stance.translateYPx * scale}px, 0) rotate(${stance.rotationDeg * scale}deg) scale(${scaleX}, ${scaleY})`;
}
