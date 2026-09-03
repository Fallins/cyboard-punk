import type { Nyx2DArticulationPose } from './nyx2dArticulation';

export interface Nyx2DWorldPoint {
  x: number;
  y: number;
}

export interface Nyx2DArticulationAnchors {
  leftElbow: Nyx2DWorldPoint;
  rightElbow: Nyx2DWorldPoint;
}

const current: Nyx2DArticulationPose = {
  left: { shoulderDeg: 0, elbowDeg: 0 },
  right: { shoulderDeg: 0, elbowDeg: 0 },
  torsoYaw: 0,
  torsoShiftX: 0,
  torsoLeanDeg: 0,
  mix: 0,
};

const anchors: Nyx2DArticulationAnchors = {
  leftElbow: { x: 0, y: 0 },
  rightElbow: { x: 0, y: 0 },
};
let anchorsReady = false;

function copyPose(target: Nyx2DArticulationPose, source: Nyx2DArticulationPose): void {
  target.left.shoulderDeg = source.left.shoulderDeg;
  target.left.elbowDeg = source.left.elbowDeg;
  target.right.shoulderDeg = source.right.shoulderDeg;
  target.right.elbowDeg = source.right.elbowDeg;
  target.torsoYaw = source.torsoYaw;
  target.torsoShiftX = source.torsoShiftX;
  target.torsoLeanDeg = source.torsoLeanDeg;
  target.mix = source.mix;
}

/**
 * Snapshot scalar pose values into persistent storage. The caller may reuse or
 * mutate its pose object later; body deformation always reads one coherent frame
 * without allocating another object on every animation tick.
 */
export function publishNyx2DArticulationFrame(pose: Nyx2DArticulationPose): Nyx2DArticulationPose {
  copyPose(current, pose);
  return pose;
}

export function nyx2DArticulationFrame(): Readonly<Nyx2DArticulationPose> {
  return current;
}

/**
 * Body geometry publishes the final elbow endpoints after breath + torso +
 * shoulder deformation. Values are copied into persistent storage so the
 * forearm layer can consume them without per-frame bridge allocations.
 */
export function publishNyx2DArticulationAnchors(
  value: Nyx2DArticulationAnchors,
): Nyx2DArticulationAnchors {
  anchors.leftElbow.x = value.leftElbow.x;
  anchors.leftElbow.y = value.leftElbow.y;
  anchors.rightElbow.x = value.rightElbow.x;
  anchors.rightElbow.y = value.rightElbow.y;
  anchorsReady = true;
  return value;
}

export function nyx2DArticulationAnchors(): Readonly<Nyx2DArticulationAnchors> | null {
  return anchorsReady ? anchors : null;
}

export function resetNyx2DArticulationFrame(): void {
  current.left.shoulderDeg = 0;
  current.left.elbowDeg = 0;
  current.right.shoulderDeg = 0;
  current.right.elbowDeg = 0;
  current.torsoYaw = 0;
  current.torsoShiftX = 0;
  current.torsoLeanDeg = 0;
  current.mix = 0;
  anchorsReady = false;
}
