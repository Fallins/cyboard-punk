import {
  NYX_REST_MOTION_ID,
  type NyxRuntimeEvent,
  type NyxRuntimeMotionId,
} from '../experiments/nyxVroidExperiment';

export const NYX_RANDOM_MOTION_END_HOLD_MS = 900;
export const NYX_MOTION_REST_BLEND_MS = 350;

export function restTransitionProgress(elapsedMs: number): number {
  const normalized = Math.min(1, Math.max(0, elapsedMs / NYX_MOTION_REST_BLEND_MS));
  return normalized * normalized * (3 - 2 * normalized);
}

export function shouldQueueNyxEventMotion(
  previousState: NyxRuntimeEvent | null,
  nextState: NyxRuntimeEvent,
  motionId: NyxRuntimeMotionId,
  reducedMotion: boolean,
): boolean {
  return !reducedMotion && previousState !== nextState && motionId !== NYX_REST_MOTION_ID;
}

/**
 * A VRMA is loaded asynchronously. Keeping normalized-human-bone updates off
 * until its clip exists prevents the renderer from briefly writing the bind
 * (T) pose over NYX's captured rest stance.
 */
export function shouldKeepNyxRestPoseDuringMotionLoad(hasPlayableClip: boolean): boolean {
  return !hasPlayableClip;
}

export function nextRandomNyxMotion<T extends string>(
  availableMotionIds: readonly T[],
  previousMotionId: T | null,
  random: () => number = Math.random,
): T | null {
  if (availableMotionIds.length === 0) return null;
  if (availableMotionIds.length === 1) return availableMotionIds[0];
  const candidates = previousMotionId
    ? availableMotionIds.filter((motionId) => motionId !== previousMotionId)
    : [...availableMotionIds];
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))] ?? null;
}

export function shouldRunNyxRandomAction(input: {
  readonly enabled: boolean;
  readonly visible: boolean;
  readonly reducedMotion: boolean;
  readonly eventActionActive: boolean;
}): boolean {
  return input.enabled && input.visible && !input.reducedMotion && !input.eventActionActive;
}
