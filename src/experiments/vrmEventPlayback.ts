import type { NyxRuntimeEvent } from './nyxVroidExperiment';

export function experimentalVrmMotionForRuntimeEvent<T extends string>(
  event: NyxRuntimeEvent,
  motionByEvent: Partial<Record<NyxRuntimeEvent, T | null>>,
  registeredMotionIds: readonly T[],
): T | null {
  const motionId = motionByEvent[event];
  return motionId && registeredMotionIds.includes(motionId) ? motionId : null;
}

export function chooseRandomExperimentalVrmMotion<T extends string>(
  motionIds: readonly T[],
  random: () => number = Math.random,
  previousMotionId: T | null = null,
): T | null {
  if (motionIds.length === 0) return null;
  const candidates = previousMotionId && motionIds.length > 1
    ? motionIds.filter((motionId) => motionId !== previousMotionId)
    : [...motionIds];
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))] ?? null;
}
