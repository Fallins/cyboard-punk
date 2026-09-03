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

/**
 * Source-safe semantic motion keeps shoulders and torso canonical. The approved
 * source does not contain clean hidden shoulder/torso pixels, so motion remains
 * elbow-down until dedicated source layers exist.
 *
 * 0.20 pose language:
 * - observing: a modest single-forearm "check" pose; visibly active but restrained.
 * - processing: the same side moves farther inward toward the virtual-console zone.
 * - warning: both forearms rise into an asymmetric brace silhouette.
 * - success: the opposite forearm gives a compact chest/core acknowledgement.
 */
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
    left: NEUTRAL_ARM,
    right: { shoulderDeg: 0, elbowDeg: -56 },
    torsoYaw: 0,
    torsoShiftX: 0,
    torsoLeanDeg: 0,
    mix: 1,
  },
  processing: {
    left: NEUTRAL_ARM,
    right: { shoulderDeg: 0, elbowDeg: -98 },
    torsoYaw: 0,
    torsoShiftX: 0,
    torsoLeanDeg: 0,
    mix: 1,
  },
  warning: {
    left: { shoulderDeg: 0, elbowDeg: 76 },
    right: { shoulderDeg: 0, elbowDeg: -84 },
    torsoYaw: 0,
    torsoShiftX: 0,
    torsoLeanDeg: 0,
    mix: 1,
  },
  success: {
    left: { shoulderDeg: 0, elbowDeg: 68 },
    right: NEUTRAL_ARM,
    torsoYaw: 0,
    torsoShiftX: 0,
    torsoLeanDeg: 0,
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
): Nyx2DArticulationPose {
  const arms = Math.max(0, armsScale);
  return {
    left: {
      shoulderDeg: 0,
      elbowDeg: pose.left.elbowDeg * arms,
    },
    right: {
      shoulderDeg: 0,
      elbowDeg: pose.right.elbowDeg * arms,
    },
    torsoYaw: 0,
    torsoShiftX: 0,
    torsoLeanDeg: 0,
    mix: pose.mix * arms,
  };
}

function copyPose(target: Nyx2DArticulationPose, source: Nyx2DArticulationPose): Nyx2DArticulationPose {
  target.left.shoulderDeg = source.left.shoulderDeg;
  target.left.elbowDeg = source.left.elbowDeg;
  target.right.shoulderDeg = source.right.shoulderDeg;
  target.right.elbowDeg = source.right.elbowDeg;
  target.torsoYaw = 0;
  target.torsoShiftX = 0;
  target.torsoLeanDeg = 0;
  target.mix = source.mix;
  return target;
}

export function nyx2DArticulationTarget(state: OperatorRuntimeState): Nyx2DArticulationPose {
  const tuning = nyx2DRuntimeTuning();
  return copyPose(RUNTIME_POSES[state], scaleNyx2DArticulation(POSES[state], tuning.arms));
}

export function nyx2DArticulationPoseEquals(
  a: Nyx2DArticulationPose,
  b: Nyx2DArticulationPose,
  epsilon = 0.0001,
): boolean {
  return (
    Math.abs(a.left.elbowDeg - b.left.elbowDeg) <= epsilon &&
    Math.abs(a.right.elbowDeg - b.right.elbowDeg) <= epsilon &&
    Math.abs(a.mix - b.mix) <= epsilon
  );
}

interface TransitionProfile {
  degreesPerSecond: number;
  minMs: number;
  maxMs: number;
}

function transitionProfile(state: OperatorRuntimeState): TransitionProfile {
  switch (state) {
    case 'observing':
      return { degreesPerSecond: 92, minMs: 760, maxMs: 1050 };
    case 'processing':
      return { degreesPerSecond: 88, minMs: 880, maxMs: 1220 };
    case 'warning':
      return { degreesPerSecond: 104, minMs: 800, maxMs: 1080 };
    case 'success':
      return { degreesPerSecond: 90, minMs: 780, maxMs: 1050 };
    case 'idle':
    case 'offline':
    default:
      return { degreesPerSecond: 96, minMs: 820, maxMs: 1120 };
  }
}

function maxElbowTravelDeg(from: Nyx2DArticulationPose, to: Nyx2DArticulationPose): number {
  return Math.max(
    Math.abs(to.left.elbowDeg - from.left.elbowDeg),
    Math.abs(to.right.elbowDeg - from.right.elbowDeg),
  );
}

/**
 * Transition time follows the actual angular distance instead of blindly using
 * one duration per state. Small semantic changes stay responsive while large
 * cross-body changes retain enough time to read as human motion rather than a servo.
 */
export function nyx2DArticulationTransitionMs(
  state: OperatorRuntimeState,
  from = nyx2DArticulationTarget('idle'),
  to = nyx2DArticulationTarget(state),
): number {
  const profile = transitionProfile(state);
  const travel = maxElbowTravelDeg(from, to);
  const travelMs = (travel / profile.degreesPerSecond) * 1000;
  return Math.round(Math.max(profile.minMs, Math.min(profile.maxMs, travelMs)));
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * amount;
}

function smootherStep01(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * One continuous ease owns the whole transition. The previous two-stage ease
 * deliberately stopped at ~96% and then restarted a final settle segment; that
 * created the visible hitch users noticed near the end of a forearm motion.
 */
function humanEase01(value: number): number {
  return smootherStep01(value);
}

function delayedEase01(progress: number, delayFraction: number): number {
  if (progress <= delayFraction) return 0;
  return humanEase01((progress - delayFraction) / (1 - delayFraction));
}

export function interpolateNyx2DArticulation(
  from: Nyx2DArticulationPose,
  to: Nyx2DArticulationPose,
  progress: number,
): Nyx2DArticulationPose {
  const leftT = humanEase01(progress);
  const bilateral =
    (Math.abs(from.left.elbowDeg) > 0.001 || Math.abs(to.left.elbowDeg) > 0.001) &&
    (Math.abs(from.right.elbowDeg) > 0.001 || Math.abs(to.right.elbowDeg) > 0.001);
  // A tiny asymmetry keeps a bilateral brace from reading as two synchronized servos.
  const rightT = bilateral ? delayedEase01(progress, 0.045) : leftT;
  const mixT = Math.max(leftT, rightT);

  return {
    left: {
      shoulderDeg: 0,
      elbowDeg: lerp(from.left.elbowDeg, to.left.elbowDeg, leftT),
    },
    right: {
      shoulderDeg: 0,
      elbowDeg: lerp(from.right.elbowDeg, to.right.elbowDeg, rightT),
    },
    torsoYaw: 0,
    torsoShiftX: 0,
    torsoLeanDeg: 0,
    mix: lerp(from.mix, to.mix, mixT),
  };
}

export function nyx2DArticulationIsNeutral(pose: Nyx2DArticulationPose): boolean {
  return (
    Math.abs(pose.left.elbowDeg) < 0.001 &&
    Math.abs(pose.right.elbowDeg) < 0.001 &&
    pose.mix < 0.001
  );
}
