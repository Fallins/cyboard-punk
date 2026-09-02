import type { OperatorRuntimeState } from './operatorRuntime';

export interface Nyx2DArmPose {
  shoulderDeg: number;
  elbowDeg: number;
}

export interface Nyx2DArticulationPose {
  left: Nyx2DArmPose;
  right: Nyx2DArmPose;
  torsoYaw: number;
  torsoShiftX: number;
  torsoLeanDeg: number;
  mix: number;
}

const NEUTRAL_ARM: Nyx2DArmPose = { shoulderDeg: 0, elbowDeg: 0 };

const POSES: Record<OperatorRuntimeState, Nyx2DArticulationPose> = {
  idle: {
    left: NEUTRAL_ARM,
    right: NEUTRAL_ARM,
    torsoYaw: 0,
    torsoShiftX: 0,
    torsoLeanDeg: 0,
    mix: 0,
  },
  observing: {
    // Viewer-right / NYX left arm opens and bends inward as if tracking a
    // floating provider panel. The chest turns slightly toward the target side.
    left: NEUTRAL_ARM,
    right: { shoulderDeg: 30, elbowDeg: -100 },
    torsoYaw: -0.42,
    torsoShiftX: -0.004,
    torsoLeanDeg: -0.45,
    mix: 1,
  },
  processing: {
    // A clear one-handed console pose: upper arm opens, forearm folds across the
    // torso so the hand lands around the chest/core area rather than the hip.
    left: NEUTRAL_ARM,
    right: { shoulderDeg: 40, elbowDeg: -140 },
    torsoYaw: -0.18,
    torsoShiftX: -0.002,
    torsoLeanDeg: -0.2,
    mix: 1,
  },
  warning: {
    // Both forearms rise into a restrained brace. This is intentionally
    // asymmetrical enough to avoid a robotic mirror pose while remaining
    // unmistakably different from idle/processing.
    left: { shoulderDeg: -45, elbowDeg: 140 },
    right: { shoulderDeg: 45, elbowDeg: -135 },
    torsoYaw: 0,
    torsoShiftX: 0,
    torsoLeanDeg: 0,
    mix: 1,
  },
  success: {
    // One hand returns toward the core in a short acknowledgement pose. The
    // opposite arm remains relaxed instead of making the whole body bounce.
    left: { shoulderDeg: -25, elbowDeg: 140 },
    right: NEUTRAL_ARM,
    torsoYaw: 0.18,
    torsoShiftX: 0.002,
    torsoLeanDeg: 0.25,
    mix: 1,
  },
  offline: {
    left: NEUTRAL_ARM,
    right: NEUTRAL_ARM,
    torsoYaw: 0,
    torsoShiftX: 0,
    torsoLeanDeg: 0,
    mix: 0,
  },
};

export function nyx2DArticulationTarget(state: OperatorRuntimeState): Nyx2DArticulationPose {
  return POSES[state];
}

export function nyx2DArticulationTransitionMs(state: OperatorRuntimeState): number {
  switch (state) {
    case 'warning':
      return 420;
    case 'success':
      return 520;
    case 'observing':
      return 620;
    case 'processing':
      return 680;
    case 'idle':
    case 'offline':
    default:
      return 520;
  }
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * amount;
}

function smoothstep01(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function interpolateNyx2DArticulation(
  from: Nyx2DArticulationPose,
  to: Nyx2DArticulationPose,
  progress: number,
): Nyx2DArticulationPose {
  const t = smoothstep01(progress);
  return {
    left: {
      shoulderDeg: lerp(from.left.shoulderDeg, to.left.shoulderDeg, t),
      elbowDeg: lerp(from.left.elbowDeg, to.left.elbowDeg, t),
    },
    right: {
      shoulderDeg: lerp(from.right.shoulderDeg, to.right.shoulderDeg, t),
      elbowDeg: lerp(from.right.elbowDeg, to.right.elbowDeg, t),
    },
    torsoYaw: lerp(from.torsoYaw, to.torsoYaw, t),
    torsoShiftX: lerp(from.torsoShiftX, to.torsoShiftX, t),
    torsoLeanDeg: lerp(from.torsoLeanDeg, to.torsoLeanDeg, t),
    mix: lerp(from.mix, to.mix, t),
  };
}

export function nyx2DArticulationIsNeutral(pose: Nyx2DArticulationPose): boolean {
  return (
    Math.abs(pose.left.shoulderDeg) < 0.001 &&
    Math.abs(pose.left.elbowDeg) < 0.001 &&
    Math.abs(pose.right.shoulderDeg) < 0.001 &&
    Math.abs(pose.right.elbowDeg) < 0.001 &&
    Math.abs(pose.torsoYaw) < 0.001 &&
    Math.abs(pose.torsoShiftX) < 0.0001 &&
    Math.abs(pose.torsoLeanDeg) < 0.001 &&
    pose.mix < 0.001
  );
}
