import { untrack } from 'solid-js';
import type { NyxCameraView } from '../settings/nyxCameraView';

export type NyxScalableModel = {
  readonly scale: { setScalar: (value: number) => void };
  readonly position: { y: number };
};

/** Character scale owns only the model transform; camera framing is a separate user-controlled state. */
export function applyNyxModelScale(
  model: NyxScalableModel,
  rawModelMinY: number,
  baseModelScale: number,
  characterScale: number,
): number {
  const scale = baseModelScale * characterScale;
  model.scale.setScalar(scale);
  model.position.y = -rawModelMinY * scale;
  return scale;
}

/** A parent persistence callback may read settings signals; those must never become runtime-effect dependencies. */
export function publishNyxCameraView(
  callback: ((view: NyxCameraView) => void) | undefined,
  view: NyxCameraView,
): void {
  untrack(() => callback?.(view));
}
