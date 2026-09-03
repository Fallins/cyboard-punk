import type { Nyx2DArticulationPose } from './nyx2dArticulation';

const NEUTRAL: Nyx2DArticulationPose = {
  left: { shoulderDeg: 0, elbowDeg: 0 },
  right: { shoulderDeg: 0, elbowDeg: 0 },
  torsoYaw: 0,
  torsoShiftX: 0,
  torsoLeanDeg: 0,
  mix: 0,
};

let current: Nyx2DArticulationPose = NEUTRAL;

export function publishNyx2DArticulationFrame(pose: Nyx2DArticulationPose): Nyx2DArticulationPose {
  current = pose;
  return pose;
}

export function nyx2DArticulationFrame(): Readonly<Nyx2DArticulationPose> {
  return current;
}

export function resetNyx2DArticulationFrame(): void {
  current = NEUTRAL;
}
