import * as THREE from 'three';
import {
  nyx2DArticulationFrame,
  publishNyx2DArticulationAnchors,
} from './nyx2dArticulationFrame';
import type { Nyx2DBreathPose } from './nyx2dBreath';
import { NYX_2D_MASTER, NYX_2D_RIG_ZONES } from './nyx2dRig';
import {
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

  // The shoulder stays pinned, while the elbow must receive full motion so the
  // movable forearm can share exactly the same endpoint. A short cap after the
  // elbow feathers nearby body vertices without freezing the elbow itself.
  if (sample.rawAlong < 0 || sample.rawAlong > 1.08) return 0;
  const outer = calibration.influenceRadiusPx;
  const inner = Math.max(1, outer - calibration.featherPx);
  const radial = 1 - smoothstep01((sample.distance - inner) / Math.max(1, outer - inner));
  const shoulderFade = smoothstep01(sample.along / 0.12);
  const elbowCap = sample.rawAlong <= 1
    ? 1
    : 1 - smoothstep01((sample.rawAlong - 1) / 0.08);
  return Math.max(0, Math.min(1, radial * shoulderFade * elbowCap));
}

function sourceToWorld(point: Nyx2DSourcePoint): { x: number; y: number } {
  return {
    x: (point.x / NYX_2D_MASTER.width - 0.5) * MASTER_ASPECT,
    y: 0.5 - point.y / NYX_2D_MASTER.height,
  };
}

function sourceUv(point: Nyx2DSourcePoint): { u: number; v: number } {
  return {
    u: point.x / NYX_2D_MASTER.width,
    v: 1 - point.y / NYX_2D_MASTER.height,
  };
}

function rotateAround(
  x: number,
  y: number,
  pivotX: number,
  pivotY: number,
  angleRad: number,
): { x: number; y: number } {
  if (Math.abs(angleRad) < 1e-8) return { x, y };
  const dx = x - pivotX;
  const dy = y - pivotY;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: pivotX + dx * cos - dy * sin,
    y: pivotY + dx * sin + dy * cos,
  };
}

function transformTorsoPoint(
  neutralX: number,
  neutralY: number,
  weight: number,
  pose: Nyx2DBreathPose,
  articulation: Nyx2DTorsoArticulation,
): { x: number; y: number } {
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

  return {
    x: breathedX + (yawX - breathedX) * weight + turnShift - leanShift,
    y: breathedY,
  };
}

function torsoWeightForSourcePoint(point: Nyx2DSourcePoint): number {
  const uv = sourceUv(point);
  return featheredRectWeight(uv.u, uv.v, NYX_2D_RIG_ZONES.torso);
}

function transformedShoulderPivot(
  side: Nyx2DBodySide,
  pose: Nyx2DBreathPose,
  articulation: Nyx2DTorsoArticulation,
): { x: number; y: number } {
  const shoulder = nyx2DUpperArmCalibration(side).shoulder;
  const neutral = sourceToWorld(shoulder);
  return transformTorsoPoint(neutral.x, neutral.y, torsoWeightForSourcePoint(shoulder), pose, articulation);
}

/**
 * Transform an exact source-space body point with the same breath/torso/shoulder
 * math used by the body mesh. Forearm anchors use this helper so the elbow cannot
 * drift away from the upper arm during breathing or source-guided shoulder motion.
 */
export function nyx2DTransformBodyPoint(
  point: Nyx2DSourcePoint,
  pose: Nyx2DBreathPose,
  articulation: Nyx2DTorsoArticulation,
  side?: Nyx2DBodySide,
): { x: number; y: number } {
  const uv = sourceUv(point);
  const neutral = sourceToWorld(point);
  let transformed = transformTorsoPoint(
    neutral.x,
    neutral.y,
    featheredRectWeight(uv.u, uv.v, NYX_2D_RIG_ZONES.torso),
    pose,
    articulation,
  );

  if (side) {
    const sharedFrame = nyx2DArticulationFrame();
    const shoulderDeg = clampNyx2DShoulderDeg(
      side === 'left'
        ? articulation.leftShoulderDeg ?? sharedFrame.left.shoulderDeg
        : articulation.rightShoulderDeg ?? sharedFrame.right.shoulderDeg,
    );
    const weight = upperArmWeight(side, uv.u, uv.v);
    if (weight > 0.0001 && Math.abs(shoulderDeg) > 0.0001) {
      const pivot = transformedShoulderPivot(side, pose, articulation);
      transformed = rotateAround(
        transformed.x,
        transformed.y,
        pivot.x,
        pivot.y,
        shoulderDeg * weight * DEG_TO_RAD,
      );
    }
  }

  return transformed;
}

function publishNeutralElbowAnchors(): void {
  publishNyx2DArticulationAnchors({
    leftElbow: sourceToWorld(nyx2DUpperArmCalibration('left').elbow),
    rightElbow: sourceToWorld(nyx2DUpperArmCalibration('right').elbow),
  });
}

export function createNyx2DBodyGeometryRig(): Nyx2DBodyGeometryRig {
  const geometry = new THREE.PlaneGeometry(MASTER_ASPECT, 1, 16, 32);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const neutralPositions = new Float32Array(position.array as ArrayLike<number>);
  const torsoWeights = new Float32Array(position.count);
  const leftUpperArmWeights = new Float32Array(position.count);
  const rightUpperArmWeights = new Float32Array(position.count);
  const torso = NYX_2D_RIG_ZONES.torso;

  for (let i = 0; i < position.count; i += 1) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    torsoWeights[i] = featheredRectWeight(u, v, torso);
    leftUpperArmWeights[i] = upperArmWeight('left', u, v);
    rightUpperArmWeights[i] = upperArmWeight('right', u, v);
  }

  publishNeutralElbowAnchors();
  return {
    geometry,
    neutralPositions,
    torsoWeights,
    leftUpperArmWeights,
    rightUpperArmWeights,
  };
}

export function resetNyx2DBodyGeometry(rig: Nyx2DBodyGeometryRig): void {
  const position = rig.geometry.getAttribute('position') as THREE.BufferAttribute;
  (position.array as Float32Array).set(rig.neutralPositions);
  position.needsUpdate = true;
  publishNeutralElbowAnchors();
}

export function applyNyx2DBreathPose(
  rig: Nyx2DBodyGeometryRig,
  pose: Nyx2DBreathPose,
  articulation: Nyx2DTorsoArticulation = { yaw: 0, shiftX: 0, leanDeg: 0 },
): void {
  const position = rig.geometry.getAttribute('position') as THREE.BufferAttribute;
  const array = position.array as Float32Array;
  const sharedFrame = nyx2DArticulationFrame();
  const effectiveArticulation: Nyx2DTorsoArticulation = {
    ...articulation,
    leftShoulderDeg: articulation.leftShoulderDeg ?? sharedFrame.left.shoulderDeg,
    rightShoulderDeg: articulation.rightShoulderDeg ?? sharedFrame.right.shoulderDeg,
  };
  const leftPivot = transformedShoulderPivot('left', pose, effectiveArticulation);
  const rightPivot = transformedShoulderPivot('right', pose, effectiveArticulation);
  const leftShoulderDeg = clampNyx2DShoulderDeg(effectiveArticulation.leftShoulderDeg ?? 0);
  const rightShoulderDeg = clampNyx2DShoulderDeg(effectiveArticulation.rightShoulderDeg ?? 0);

  for (let i = 0; i < position.count; i += 1) {
    const offset = i * 3;
    const neutralX = rig.neutralPositions[offset];
    const neutralY = rig.neutralPositions[offset + 1];
    let transformed = transformTorsoPoint(
      neutralX,
      neutralY,
      rig.torsoWeights[i],
      pose,
      effectiveArticulation,
    );

    const leftWeight = rig.leftUpperArmWeights[i];
    if (leftWeight > 0.0001 && Math.abs(leftShoulderDeg) > 0.0001) {
      transformed = rotateAround(
        transformed.x,
        transformed.y,
        leftPivot.x,
        leftPivot.y,
        leftShoulderDeg * leftWeight * DEG_TO_RAD,
      );
    }

    const rightWeight = rig.rightUpperArmWeights[i];
    if (rightWeight > 0.0001 && Math.abs(rightShoulderDeg) > 0.0001) {
      transformed = rotateAround(
        transformed.x,
        transformed.y,
        rightPivot.x,
        rightPivot.y,
        rightShoulderDeg * rightWeight * DEG_TO_RAD,
      );
    }

    array[offset] = transformed.x;
    array[offset + 1] = transformed.y;
    array[offset + 2] = rig.neutralPositions[offset + 2];
  }

  publishNyx2DArticulationAnchors({
    leftElbow: nyx2DTransformBodyPoint(
      nyx2DUpperArmCalibration('left').elbow,
      pose,
      effectiveArticulation,
      'left',
    ),
    rightElbow: nyx2DTransformBodyPoint(
      nyx2DUpperArmCalibration('right').elbow,
      pose,
      effectiveArticulation,
      'right',
    ),
  });
  position.needsUpdate = true;
}
