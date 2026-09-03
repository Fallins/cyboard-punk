import * as THREE from 'three';
import {
  nyx2DArticulationFrame,
  publishNyx2DArticulationAnchors,
  type Nyx2DArticulationAnchors,
  type Nyx2DWorldPoint,
} from './nyx2dArticulationFrame';
import type { Nyx2DBreathPose } from './nyx2dBreath';
import { NYX_2D_MASTER, NYX_2D_RIG_ZONES } from './nyx2dRig';
import {
  NYX_2D_UPPER_BODY_CALIBRATION,
  clampNyx2DShoulderDeg,
  clampNyx2DTorsoLeanDeg,
  clampNyx2DTorsoShiftX,
  clampNyx2DTorsoYaw,
  nyx2DUpperArmCalibration,
  type Nyx2DBodySide,
  type Nyx2DSourcePoint,
} from './nyx2dUpperBodyCalibration';

export interface Nyx2DBodyGeometryRig {
  geometry: THREE.PlaneGeometry;
  neutralPositions: Float32Array;
  torsoWeights: Float32Array;
  leftUpperArmWeights: Float32Array;
  rightUpperArmWeights: Float32Array;
  leftShoulderCapWeights: Float32Array;
  rightShoulderCapWeights: Float32Array;
  scratchPoint: Nyx2DWorldPoint;
  leftPivot: Nyx2DWorldPoint;
  rightPivot: Nyx2DWorldPoint;
  anchors: Nyx2DArticulationAnchors;
}

export interface Nyx2DTorsoArticulation {
  yaw: number;
  shiftX: number;
  leanDeg: number;
  leftShoulderDeg?: number;
  rightShoulderDeg?: number;
}

const MASTER_ASPECT = NYX_2D_MASTER.width / NYX_2D_MASTER.height;
const DEG_TO_RAD = Math.PI / 180;

function smoothstep01(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function featheredRectWeight(
  x: number,
  y: number,
  rect: (typeof NYX_2D_RIG_ZONES)['torso'],
): number {
  if (x <= rect.left || x >= rect.right || y <= rect.bottom || y >= rect.top) return 0;

  const featherX = Math.min(0.055, (rect.right - rect.left) * 0.2);
  const featherY = Math.min(0.05, (rect.top - rect.bottom) * 0.2);
  const left = smoothstep01((x - rect.left) / featherX);
  const right = smoothstep01((rect.right - x) / featherX);
  const bottom = smoothstep01((y - rect.bottom) / featherY);
  const top = smoothstep01((rect.top - y) / featherY);
  return left * right * bottom * top;
}

function pointSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { distance: number; along: number; rawAlong: number } {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  const rawAlong = lengthSq > 0 ? ((px - ax) * abx + (py - ay) * aby) / lengthSq : 0;
  const along = Math.max(0, Math.min(1, rawAlong));
  const closestX = ax + abx * along;
  const closestY = ay + aby * along;
  return { distance: Math.hypot(px - closestX, py - closestY), along, rawAlong };
}

function shoulderCapWeight(side: Nyx2DBodySide, u: number, v: number): number {
  const calibration = nyx2DUpperArmCalibration(side);
  const px = u * NYX_2D_MASTER.width;
  const py = (1 - v) * NYX_2D_MASTER.height;
  const dx = px - calibration.shoulder.x;
  const dy = py - calibration.shoulder.y;
  const distance = Math.hypot(dx, dy);
  const outer = calibration.shoulderCapRadiusPx;
  if (distance >= outer) return 0;

  const inner = Math.max(1, outer - calibration.shoulderCapFeatherPx);
  const radial = 1 - smoothstep01((distance - inner) / Math.max(1, outer - inner));
  // Prevent the cap from reaching too far into the chest/clavicle. Image-left is
  // NYX's left side in this front-facing source, so inward direction is mirrored.
  const inward = side === 'left' ? dx : -dx;
  const inwardFade =
    1 -
    smoothstep01(
      (inward - calibration.shoulderInwardAllowancePx) /
        Math.max(1, calibration.shoulderCapFeatherPx),
    );
  return Math.max(0, Math.min(1, radial * inwardFade));
}

function upperArmWeight(side: Nyx2DBodySide, u: number, v: number): number {
  const calibration = nyx2DUpperArmCalibration(side);
  const px = u * NYX_2D_MASTER.width;
  const py = (1 - v) * NYX_2D_MASTER.height;
  const sample = pointSegmentDistance(
    px,
    py,
    calibration.shoulder.x,
    calibration.shoulder.y,
    calibration.elbow.x,
    calibration.elbow.y,
  );
  const cap = shoulderCapWeight(side, u, v);

  if (sample.rawAlong < -0.12 || sample.rawAlong > 1.08) return cap * 0.5;
  const outer = calibration.influenceRadiusPx;
  const inner = Math.max(1, outer - calibration.featherPx);
  const radial = 1 - smoothstep01((sample.distance - inner) / Math.max(1, outer - inner));
  // 0.21 pinned the first 12% of the chain, which visually froze the shoulder.
  // Keep a restrained amount of rotation at the cap and ramp to full upper-arm
  // rotation before the elbow.
  const shoulderLead = 0.34 + 0.66 * smoothstep01(sample.along / 0.18);
  const elbowCap = sample.rawAlong <= 1
    ? 1
    : 1 - smoothstep01((sample.rawAlong - 1) / 0.08);
  const chain = radial * shoulderLead * elbowCap;
  return Math.max(0, Math.min(1, Math.max(chain, cap * 0.5)));
}

function sourceToWorldInto(out: Nyx2DWorldPoint, point: Nyx2DSourcePoint): Nyx2DWorldPoint {
  out.x = (point.x / NYX_2D_MASTER.width - 0.5) * MASTER_ASPECT;
  out.y = 0.5 - point.y / NYX_2D_MASTER.height;
  return out;
}

function rotateAroundInto(
  out: Nyx2DWorldPoint,
  x: number,
  y: number,
  pivotX: number,
  pivotY: number,
  angleRad: number,
): Nyx2DWorldPoint {
  if (Math.abs(angleRad) < 1e-8) {
    out.x = x;
    out.y = y;
    return out;
  }
  const dx = x - pivotX;
  const dy = y - pivotY;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  out.x = pivotX + dx * cos - dy * sin;
  out.y = pivotY + dx * sin + dy * cos;
  return out;
}

function applyShoulderOffsetInto(
  out: Nyx2DWorldPoint,
  side: Nyx2DBodySide,
  shoulderDeg: number,
  weight = 1,
): Nyx2DWorldPoint {
  const limits = NYX_2D_UPPER_BODY_CALIBRATION.limits;
  const engagement = smoothstep01(Math.abs(shoulderDeg) / Math.max(0.001, limits.shoulderDeg));
  const clampedWeight = Math.max(0, Math.min(1, weight));
  const inwardSign = side === 'left' ? 1 : -1;
  out.x += inwardSign * limits.shoulderInwardWorld * engagement * clampedWeight;
  out.y += limits.shoulderLiftWorld * engagement * clampedWeight;
  return out;
}

function transformTorsoPointInto(
  out: Nyx2DWorldPoint,
  neutralX: number,
  neutralY: number,
  weight: number,
  pose: Nyx2DBreathPose,
  articulation: Nyx2DTorsoArticulation,
): Nyx2DWorldPoint {
  const torso = NYX_2D_RIG_ZONES.torso;
  const centerX = ((torso.left + torso.right) * 0.5 - 0.5) * MASTER_ASPECT;
  const centerY = (torso.bottom + torso.top) * 0.5 - 0.5;
  const yaw = clampNyx2DTorsoYaw(articulation.yaw);
  const shiftX = clampNyx2DTorsoShiftX(articulation.shiftX);
  const leanDeg = clampNyx2DTorsoLeanDeg(articulation.leanDeg);
  const squeeze = 1 - Math.abs(yaw) * 0.055;
  const leanTan = Math.tan(leanDeg * DEG_TO_RAD);

  const breathedX = neutralX + (neutralX - centerX) * (pose.scaleX - 1) * weight;
  const breathedY =
    neutralY +
    (pose.translateY + (neutralY - centerY) * (pose.scaleY - 1)) * weight;
  const yawX = centerX + (breathedX - centerX) * squeeze;
  const turnShift = (shiftX + yaw * 0.006) * weight;
  const leanShift = (breathedY - centerY) * leanTan * weight;

  out.x = breathedX + (yawX - breathedX) * weight + turnShift - leanShift;
  out.y = breathedY;
  return out;
}

function torsoWeightForSourcePoint(point: Nyx2DSourcePoint): number {
  const u = point.x / NYX_2D_MASTER.width;
  const v = 1 - point.y / NYX_2D_MASTER.height;
  return featheredRectWeight(u, v, NYX_2D_RIG_ZONES.torso);
}

function shoulderDegFor(
  side: Nyx2DBodySide,
  articulation: Nyx2DTorsoArticulation,
): number {
  const sharedFrame = nyx2DArticulationFrame();
  return clampNyx2DShoulderDeg(
    side === 'left'
      ? articulation.leftShoulderDeg ?? sharedFrame.left.shoulderDeg
      : articulation.rightShoulderDeg ?? sharedFrame.right.shoulderDeg,
  );
}

function transformedShoulderPivotInto(
  out: Nyx2DWorldPoint,
  side: Nyx2DBodySide,
  pose: Nyx2DBreathPose,
  articulation: Nyx2DTorsoArticulation,
): Nyx2DWorldPoint {
  const shoulder = nyx2DUpperArmCalibration(side).shoulder;
  sourceToWorldInto(out, shoulder);
  transformTorsoPointInto(
    out,
    out.x,
    out.y,
    torsoWeightForSourcePoint(shoulder),
    pose,
    articulation,
  );
  return applyShoulderOffsetInto(out, side, shoulderDegFor(side, articulation));
}

function transformBodyPointInto(
  out: Nyx2DWorldPoint,
  pivotScratch: Nyx2DWorldPoint,
  point: Nyx2DSourcePoint,
  pose: Nyx2DBreathPose,
  articulation: Nyx2DTorsoArticulation,
  side?: Nyx2DBodySide,
): Nyx2DWorldPoint {
  const u = point.x / NYX_2D_MASTER.width;
  const v = 1 - point.y / NYX_2D_MASTER.height;
  sourceToWorldInto(out, point);
  transformTorsoPointInto(
    out,
    out.x,
    out.y,
    featheredRectWeight(u, v, NYX_2D_RIG_ZONES.torso),
    pose,
    articulation,
  );

  if (!side) return out;

  const shoulderDeg = shoulderDegFor(side, articulation);
  const armWeight = upperArmWeight(side, u, v);
  const capWeight = shoulderCapWeight(side, u, v);
  const motionWeight = Math.max(armWeight, capWeight);
  if (motionWeight <= 0.0001 || Math.abs(shoulderDeg) <= 0.0001) return out;

  applyShoulderOffsetInto(out, side, shoulderDeg, motionWeight);
  transformedShoulderPivotInto(pivotScratch, side, pose, articulation);
  return rotateAroundInto(
    out,
    out.x,
    out.y,
    pivotScratch.x,
    pivotScratch.y,
    shoulderDeg * armWeight * DEG_TO_RAD,
  );
}

/**
 * Public exact-point helper used by tests/calibration tools. Runtime mesh updates
 * use persistent rig scratch buffers and do not call this allocating wrapper.
 */
export function nyx2DTransformBodyPoint(
  point: Nyx2DSourcePoint,
  pose: Nyx2DBreathPose,
  articulation: Nyx2DTorsoArticulation,
  side?: Nyx2DBodySide,
): { x: number; y: number } {
  const out = { x: 0, y: 0 };
  const pivot = { x: 0, y: 0 };
  transformBodyPointInto(out, pivot, point, pose, articulation, side);
  return out;
}

function publishNeutralElbowAnchors(rig: Nyx2DBodyGeometryRig): void {
  sourceToWorldInto(rig.anchors.leftElbow, nyx2DUpperArmCalibration('left').elbow);
  sourceToWorldInto(rig.anchors.rightElbow, nyx2DUpperArmCalibration('right').elbow);
  publishNyx2DArticulationAnchors(rig.anchors);
}

export function createNyx2DBodyGeometryRig(): Nyx2DBodyGeometryRig {
  // 24x40 gives the shoulder cap enough local vertices to deform visibly while
  // keeping the body at 1920 triangles, below the stable runtime budget.
  const geometry = new THREE.PlaneGeometry(MASTER_ASPECT, 1, 24, 40);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const neutralPositions = new Float32Array(position.array as ArrayLike<number>);
  const torsoWeights = new Float32Array(position.count);
  const leftUpperArmWeights = new Float32Array(position.count);
  const rightUpperArmWeights = new Float32Array(position.count);
  const leftShoulderCapWeights = new Float32Array(position.count);
  const rightShoulderCapWeights = new Float32Array(position.count);
  const torso = NYX_2D_RIG_ZONES.torso;

  for (let i = 0; i < position.count; i += 1) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    torsoWeights[i] = featheredRectWeight(u, v, torso);
    leftUpperArmWeights[i] = upperArmWeight('left', u, v);
    rightUpperArmWeights[i] = upperArmWeight('right', u, v);
    leftShoulderCapWeights[i] = shoulderCapWeight('left', u, v);
    rightShoulderCapWeights[i] = shoulderCapWeight('right', u, v);
  }

  const rig: Nyx2DBodyGeometryRig = {
    geometry,
    neutralPositions,
    torsoWeights,
    leftUpperArmWeights,
    rightUpperArmWeights,
    leftShoulderCapWeights,
    rightShoulderCapWeights,
    scratchPoint: { x: 0, y: 0 },
    leftPivot: { x: 0, y: 0 },
    rightPivot: { x: 0, y: 0 },
    anchors: {
      leftElbow: { x: 0, y: 0 },
      rightElbow: { x: 0, y: 0 },
    },
  };
  publishNeutralElbowAnchors(rig);
  return rig;
}

export function resetNyx2DBodyGeometry(rig: Nyx2DBodyGeometryRig): void {
  const position = rig.geometry.getAttribute('position') as THREE.BufferAttribute;
  (position.array as Float32Array).set(rig.neutralPositions);
  position.needsUpdate = true;
  publishNeutralElbowAnchors(rig);
}

export function applyNyx2DBreathPose(
  rig: Nyx2DBodyGeometryRig,
  pose: Nyx2DBreathPose,
  articulation: Nyx2DTorsoArticulation = { yaw: 0, shiftX: 0, leanDeg: 0 },
): void {
  const position = rig.geometry.getAttribute('position') as THREE.BufferAttribute;
  const array = position.array as Float32Array;
  const leftShoulderDeg = shoulderDegFor('left', articulation);
  const rightShoulderDeg = shoulderDegFor('right', articulation);

  transformedShoulderPivotInto(rig.leftPivot, 'left', pose, articulation);
  transformedShoulderPivotInto(rig.rightPivot, 'right', pose, articulation);

  for (let i = 0; i < position.count; i += 1) {
    const offset = i * 3;
    const neutralX = rig.neutralPositions[offset];
    const neutralY = rig.neutralPositions[offset + 1];
    transformTorsoPointInto(
      rig.scratchPoint,
      neutralX,
      neutralY,
      rig.torsoWeights[i],
      pose,
      articulation,
    );

    const leftWeight = rig.leftUpperArmWeights[i];
    const leftMotionWeight = Math.max(leftWeight, rig.leftShoulderCapWeights[i]);
    if (leftMotionWeight > 0.0001 && Math.abs(leftShoulderDeg) > 0.0001) {
      applyShoulderOffsetInto(rig.scratchPoint, 'left', leftShoulderDeg, leftMotionWeight);
      rotateAroundInto(
        rig.scratchPoint,
        rig.scratchPoint.x,
        rig.scratchPoint.y,
        rig.leftPivot.x,
        rig.leftPivot.y,
        leftShoulderDeg * leftWeight * DEG_TO_RAD,
      );
    }

    const rightWeight = rig.rightUpperArmWeights[i];
    const rightMotionWeight = Math.max(rightWeight, rig.rightShoulderCapWeights[i]);
    if (rightMotionWeight > 0.0001 && Math.abs(rightShoulderDeg) > 0.0001) {
      applyShoulderOffsetInto(rig.scratchPoint, 'right', rightShoulderDeg, rightMotionWeight);
      rotateAroundInto(
        rig.scratchPoint,
        rig.scratchPoint.x,
        rig.scratchPoint.y,
        rig.rightPivot.x,
        rig.rightPivot.y,
        rightShoulderDeg * rightWeight * DEG_TO_RAD,
      );
    }

    array[offset] = rig.scratchPoint.x;
    array[offset + 1] = rig.scratchPoint.y;
    array[offset + 2] = rig.neutralPositions[offset + 2];
  }

  const leftElbow = nyx2DUpperArmCalibration('left').elbow;
  sourceToWorldInto(rig.anchors.leftElbow, leftElbow);
  transformTorsoPointInto(
    rig.anchors.leftElbow,
    rig.anchors.leftElbow.x,
    rig.anchors.leftElbow.y,
    torsoWeightForSourcePoint(leftElbow),
    pose,
    articulation,
  );
  applyShoulderOffsetInto(rig.anchors.leftElbow, 'left', leftShoulderDeg);
  rotateAroundInto(
    rig.anchors.leftElbow,
    rig.anchors.leftElbow.x,
    rig.anchors.leftElbow.y,
    rig.leftPivot.x,
    rig.leftPivot.y,
    leftShoulderDeg * DEG_TO_RAD,
  );

  const rightElbow = nyx2DUpperArmCalibration('right').elbow;
  sourceToWorldInto(rig.anchors.rightElbow, rightElbow);
  transformTorsoPointInto(
    rig.anchors.rightElbow,
    rig.anchors.rightElbow.x,
    rig.anchors.rightElbow.y,
    torsoWeightForSourcePoint(rightElbow),
    pose,
    articulation,
  );
  applyShoulderOffsetInto(rig.anchors.rightElbow, 'right', rightShoulderDeg);
  rotateAroundInto(
    rig.anchors.rightElbow,
    rig.anchors.rightElbow.x,
    rig.anchors.rightElbow.y,
    rig.rightPivot.x,
    rig.rightPivot.y,
    rightShoulderDeg * DEG_TO_RAD,
  );

  publishNyx2DArticulationAnchors(rig.anchors);
  position.needsUpdate = true;
}
