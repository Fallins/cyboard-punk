import { publishNyx2DArticulationFrame } from './nyx2dArticulationFrame';
import {
  nyx2DAttentionSide,
  nyx2DRuntimeAttentionTarget,
  type Nyx2DAttentionTarget,
} from './nyx2dAttention';
import { nyx2DRuntimeTuning } from './nyx2dTuning';
import type { OperatorRuntimeState } from './operatorRuntime';
import {
  clampNyx2DShoulderDeg,
  clampNyx2DTorsoLeanDeg,
  clampNyx2DTorsoShiftX,
  clampNyx2DTorsoYaw,
} from './nyx2dUpperBodyCalibration';

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
 * Source-guided upper-body language. Provider-side coordination mirrors or
 * biases this baseline without changing the canonical RGB asset.
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
    right: { shoulderDeg: 3.2, elbowDeg: -56 },
    torsoYaw: 0.08,
    torsoShiftX: 0.0013,
    torsoLeanDeg: 0.2,
    mix: 1,
  },
  processing: {
    left: NEUTRAL_ARM,
    right: { shoulderDeg: 5.4, elbowDeg: -98 },
    torsoYaw: 0.14,
    torsoShiftX: 0.0022,
    torsoLeanDeg: 0.42,
    mix: 1,
  },
  warning: {
    left: { shoulderDeg: -4.2, elbowDeg: 76 },
    right: { shoulderDeg: 4.8, elbowDeg: -84 },
    torsoYaw: 0,
    torsoShiftX: 0,
    torsoLeanDeg: -0.3,
    mix: 1,
  },
  success: {
    left: { shoulderDeg: -3.2, elbowDeg: 68 },
    right: NEUTRAL_ARM,
    torsoYaw: -0.08,
    torsoShiftX: -0.0013,
    torsoLeanDeg: 0.18,
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
 * Maps the center-facing semantic pose toward the provider side. Codex/Claude
 * live on dashboard-left; Cursor lives on dashboard-right. OBSERVE/PROCESS use
 * the hand nearest the target. WARNING remains bilateral but shifts emphasis and
 * ribcage toward the provider. SUCCESS mirrors its acknowledgement when a live
 * provider target exists.
 */
export function coordinateNyx2DArticulation(
  state: OperatorRuntimeState,
  target: Nyx2DAttentionTarget,
): Nyx2DArticulationPose {
  const pose = clonePose(POSES[state]);
  const side = nyx2DAttentionSide(target);
  if (side === 0 || state === 'idle' || state === 'offline') return pose;

  if (state === 'observing' || state === 'processing') {
    const shoulder = Math.abs(POSES[state].right.shoulderDeg);
    const elbow = Math.abs(POSES[state].right.elbowDeg);
    if (side < 0) {
      pose.left.shoulderDeg = -shoulder;
      pose.left.elbowDeg = elbow;
      pose.right.shoulderDeg = 0;
      pose.right.elbowDeg = 0;
    } else {
      pose.left.shoulderDeg = 0;
      pose.left.elbowDeg = 0;
      pose.right.shoulderDeg = shoulder;
      pose.right.elbowDeg = -elbow;
    }
    pose.torsoYaw = Math.abs(POSES[state].torsoYaw) * side;
    pose.torsoShiftX = Math.abs(POSES[state].torsoShiftX) * side;
    return pose;
  }

  if (state === 'warning') {
    const targetArmScale = 1.06;
    const supportArmScale = 0.94;
    if (side < 0) {
      pose.left.shoulderDeg *= targetArmScale;
      pose.left.elbowDeg *= targetArmScale;
      pose.right.shoulderDeg *= supportArmScale;
      pose.right.elbowDeg *= supportArmScale;
    } else {
      pose.right.shoulderDeg *= targetArmScale;
      pose.right.elbowDeg *= targetArmScale;
      pose.left.shoulderDeg *= supportArmScale;
      pose.left.elbowDeg *= supportArmScale;
    }
    pose.torsoYaw = 0.055 * side;
    pose.torsoShiftX = 0.00075 * side;
    return pose;
  }

  if (state === 'success' && side > 0) {
    const shoulder = Math.abs(POSES.success.left.shoulderDeg);
    const elbow = Math.abs(POSES.success.left.elbowDeg);
    pose.left.shoulderDeg = 0;
    pose.left.elbowDeg = 0;
    pose.right.shoulderDeg = shoulder;
    pose.right.elbowDeg = -elbow;
    pose.torsoYaw = Math.abs(POSES.success.torsoYaw);
    pose.torsoShiftX = Math.abs(POSES.success.torsoShiftX);
  }

  return pose;
}

export function scaleNyx2DArticulation(
  pose: Nyx2DArticulationPose,
  armsScale: number,
  upperBodyScale: number,
): Nyx2DArticulationPose {
  const arms = Math.max(0, armsScale);
  const upper = Math.max(0, upperBodyScale);
  return {
    left: {
      shoulderDeg: clampNyx2DShoulderDeg(pose.left.shoulderDeg * upper),
      elbowDeg: pose.left.elbowDeg * arms,
    },
    right: {
      shoulderDeg: clampNyx2DShoulderDeg(pose.right.shoulderDeg * upper),
      elbowDeg: pose.right.elbowDeg * arms,
    },
    torsoYaw: clampNyx2DTorsoYaw(pose.torsoYaw * upper),
    torsoShiftX: clampNyx2DTorsoShiftX(pose.torsoShiftX * upper),
    torsoLeanDeg: clampNyx2DTorsoLeanDeg(pose.torsoLeanDeg * upper),
    mix: pose.mix * Math.max(arms, upper),
  };
}

export function nyx2DArticulationTarget(
  state: OperatorRuntimeState,
  attentionTarget: Nyx2DAttentionTarget = nyx2DRuntimeAttentionTarget(),
): Nyx2DArticulationPose {
  const tuning = nyx2DRuntimeTuning();
  return publishNyx2DArticulationFrame(
    copyPose(
      RUNTIME_POSES[state],
      scaleNyx2DArticulation(
        coordinateNyx2DArticulation(state, attentionTarget),
        tuning.arms,
        tuning.torso,
      ),
    ),
  );
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
      return { degreesPerSecond: 88, minMs: 820, maxMs: 1220 };
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

function maxArmTravelDeg(from: Nyx2DArticulationPose, to: Nyx2DArticulationPose): number {
  return Math.max(
    Math.abs(to.left.elbowDeg - from.left.elbowDeg),
    Math.abs(to.right.elbowDeg - from.right.elbowDeg),
    Math.abs(to.left.shoulderDeg - from.left.shoulderDeg) * 3,
    Math.abs(to.right.shoulderDeg - from.right.shoulderDeg) * 3,
  );
}

export function nyx2DArticulationTransitionMs(
  state: OperatorRuntimeState,
  from = nyx2DArticulationTarget('idle', 'center'),
  to = nyx2DArticulationTarget(state),
): number {
  const profile = transitionProfile(state);
  const travel = maxArmTravelDeg(from, to);
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
  const rightT = bilateral ? delayedEase01(progress, 0.045) : leftT;
  const torsoT = humanEase01(Math.min(1, progress / 0.92));
  const mixT = Math.max(leftT, rightT, torsoT);

  return publishNyx2DArticulationFrame({
    left: {
      shoulderDeg: lerp(from.left.shoulderDeg, to.left.shoulderDeg, leftT),
      elbowDeg: lerp(from.left.elbowDeg, to.left.elbowDeg, leftT),
    },
    right: {
      shoulderDeg: lerp(from.right.shoulderDeg, to.right.shoulderDeg, rightT),
      elbowDeg: lerp(from.right.elbowDeg, to.right.elbowDeg, rightT),
    },
    torsoYaw: lerp(from.torsoYaw, to.torsoYaw, torsoT),
    torsoShiftX: lerp(from.torsoShiftX, to.torsoShiftX, torsoT),
    torsoLeanDeg: lerp(from.torsoLeanDeg, to.torsoLeanDeg, torsoT),
    mix: lerp(from.mix, to.mix, mixT),
  });
}

export function nyx2DArticulationIsNeutral(pose: Nyx2DArticulationPose): boolean {
  return (
    Math.abs(pose.left.shoulderDeg) < 0.001 &&
    Math.abs(pose.left.elbowDeg) < 0.001 &&
    Math.abs(pose.right.shoulderDeg) < 0.001 &&
    Math.abs(pose.right.elbowDeg) < 0.001 &&
    Math.abs(pose.torsoYaw) < 0.0001 &&
    Math.abs(pose.torsoShiftX) < 0.0001 &&
    Math.abs(pose.torsoLeanDeg) < 0.0001 &&
    pose.mix < 0.001
  );
}
