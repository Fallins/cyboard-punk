import type { Nyx2DBreathPose } from './nyx2dBreath';

const NEUTRAL: Nyx2DBreathPose = { translateY: 0, scaleX: 1, scaleY: 1 };
let current: Nyx2DBreathPose = NEUTRAL;

export function publishNyx2DBreathFrame(pose: Nyx2DBreathPose): Nyx2DBreathPose {
  current = pose;
  return pose;
}

export function nyx2DBreathFrame(): Readonly<Nyx2DBreathPose> {
  return current;
}

export function resetNyx2DBreathFrame(): void {
  current = NEUTRAL;
}
