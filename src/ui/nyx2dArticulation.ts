import { nyx2DRuntimeTuning } from './nyx2dTuning';
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
    // Viewer-right arm bends inward to the upper abdomen while the chest turns
    // slightly toward that side, reading as active inspection rather than idle.
    left: NEUTRAL_ARM,
    right: { shoulderDeg: 20, elbowDeg: -140 },
    torsoYaw: -0.62,
    torsoShiftX: -0.006,
    torsoLeanDeg: -0.8,
    mix: 1,
  },
  processing: {
    // Strong console/hologram silhouette. The elbow opens away from the body and
    // the forearm folds sharply up-left so the hand finishes near the chest/core.
    left: NEUTRAL_ARM,
    right: { shoulderDeg: 30, elbowDeg: -170 },
    torsoYaw: -0.32,
    torsoShiftX: -0.004,
    torsoLeanDeg: -0.45,
    mix: 1,
  },
  warning: {
    // Both elbows open and both forearms fold inward/up into a defensive brace.
    left: { shoulderDeg: -35, elbowDeg: 160 },
    right: { shoulderDeg: 35, elbowDeg: -160 },
    torsoYaw: 0,
    torsoShiftX: 0,
    torsoLeanDeg: 0,
    mix: 1,
  },
  success: {
    // Viewer-left hand folds toward the diamond core as a clear acknowledgement;
    // the other arm remains relaxed so this cannot read as another warning pose.
    left: { shoulderDeg: -20, elbowDeg: 165 },
    right: NEUTRAL_ARM,
    torsoYaw: 0.28,
    torsoShiftX: 0.003,
    torsoLeanDeg: 0.45,
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

function clonePose(pose: Nyx2DArticulationPose): Nyx2DArticulationPose {
  return {
    left: { ...pose.left },
    right: { ...pose.right },
    torsoYaw: pose.torsoYaw,
    torsoShiftX: pose.torsoShiftX,
    torsoLeanDeg: pose.torsoLeanDeg,
    mix: pose.mix,
  };
}

const RUNTIME_POSES: Record<OperatorRuntimeState, Nyx2DArticulationPose> = {
  idle: clonePose(POSES.idle),
  observing: clonePose(POSES.observing),
  processing: clonePose(POSES.processing),
  warning: clonePose(POSES.warning),
  success: clonePose(POSES.success),
  offline: clonePose(POSES.offline),
};

export function scaleNyx2DArticulation(
  pose: Nyx2DArticulationPose,
  armsScale: number,
  torsoScale: number,
): Nyx2DArticulationPose {
  const arms = Math.max(0, armsScale);
  const torso = Math.max(0, torsoScale);
  return {
    left: {
      shoulderDeg: pose.left.shoulderDeg * arms,
      elbowDeg: pose.left.elbowDeg * arms,
    },
    right: {
      shoulderDeg: pose.right.shoulderDeg * arms,
      elbowDeg: pose.right.elbowDeg * arms,
    },
    torsoYaw: pose.torsoYaw * torso,
    torsoShiftX: pose.torsoShiftX * torso,
    torsoLeanDeg: pose.torsoLeanDeg * torso,
    mix: pose.mix * Math.max(arms, torso),
  };
}

function copyPose(target: Nyx2DArticulationPose, source: Nyx2DArticulationPose): Nyx2DArticulationPose {
  target.left.shoulderDeg = source.left.shoulderDeg;
  target.left.elbowDeg = source.left.elbowDeg;
  target.right.shoulderDeg = source.right.shoulderDeg;
  target.right.elbowDeg = source.right.elbowDeg;
  target.torsoYaw = source.torsoYaw;
  target.torsoShiftX = source.torsoShiftX;
  target.torsoLeanDeg = source.torsoLeanDeg;
  target.mix = source.mix;
  return target;
}

/**
 * Returns a stable object per state. The renderer keeps this object as its
 * transition target, so live ARMS/TORSO slider changes update the target in place
 * without restarting the animation clock.
 */
export function nyx2DArticulationTarget(state: OperatorRuntimeState): Nyx2DArticulationPose {
  const tuning = nyx2DRuntimeTuning();
  return copyPose(RUNTIME_POSES[state], scaleNyx2DArticulation(POSES[state], tuning.arms, tuning.torso));
}

export function nyx2DArticulationPoseEquals(
  a: Nyx2DArticulationPose,
  b: Nyx2DArticulationPose,
  epsilon = 0.0001,
): boolean {
  return (
    Math.abs(a.left.shoulderDeg - b.left.shoulderDeg) <= epsilon &&
    Math.abs(a.left.elbowDeg - b.left.elbowDeg) <= epsilon &&
    Math.abs(a.right.shoulderDeg - b.right.shoulderDeg) <= epsilon &&
    Math.abs(a.right.elbowDeg - b.right.elbowDeg) <= epsilon &&
    Math.abs(a.torsoYaw - b.torsoYaw) <= epsilon &&
    Math.abs(a.torsoShiftX - b.torsoShiftX) <= epsilon &&
    Math.abs(a.torsoLeanDeg - b.torsoLeanDeg) <= epsilon &&
    Math.abs(a.mix - b.mix) <= epsilon
  );
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
