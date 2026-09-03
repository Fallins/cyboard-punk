import type { Nyx2DArticulationPose } from './nyx2dArticulation';

export interface Nyx2DWorldPoint {
  x: number;
  y: number;
}

export interface Nyx2DArticulationAnchors {
  leftElbow: Nyx2DWorldPoint;
  rightElbow: Nyx2DWorldPoint;
}

const NEUTRAL: Nyx2DArticulationPose = {
  left: { shoulderDeg: 0, elbowDeg: 0 },
  right: { shoulderDeg: 0, elbowDeg: 0 },
  torsoYaw: 0,
  torsoShiftX: 0,
  torsoLeanDeg: 0,
  mix: 0,
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

let current = clonePose(NEUTRAL);
let anchors: Nyx2DArticulationAnchors | null = null;

/**
 * The renderer owns one semantic articulation pose per frame. Keep a snapshot,
 * not a reference to the mutable target cache, so body deformation cannot observe
 * a later state/tuning mutation halfway through a render.
 */
export function publishNyx2DArticulationFrame(pose: Nyx2DArticulationPose): Nyx2DArticulationPose {
  current = clonePose(pose);
  return pose;
}

export function nyx2DArticulationFrame(): Readonly<Nyx2DArticulationPose> {
  return current;
}

/**
 * Body geometry publishes the final elbow endpoints after breath + torso +
 * shoulder deformation. Forearm sprites consume these exact points instead of
 * independently approximating the same transform chain.
 */
export function publishNyx2DArticulationAnchors(
  value: Nyx2DArticulationAnchors,
): Nyx2DArticulationAnchors {
  anchors = {
    leftElbow: { ...value.leftElbow },
    rightElbow: { ...value.rightElbow },
  };
  return value;
}

export function nyx2DArticulationAnchors(): Readonly<Nyx2DArticulationAnchors> | null {
  return anchors;
}

export function resetNyx2DArticulationFrame(): void {
  current = clonePose(NEUTRAL);
  anchors = null;
}
