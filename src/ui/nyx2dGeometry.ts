import * as THREE from 'three';
import type { Nyx2DBreathPose } from './nyx2dBreath';
import { NYX_2D_MASTER, NYX_2D_RIG_ZONES } from './nyx2dRig';
import {
  clampNyx2DShoulderDeg,
  clampNyx2DTorsoLeanDeg,
  clampNyx2DTorsoShiftX,
  clampNyx2DTorsoYaw,
  nyx2DUpperArmCalibration,
  type Nyx2DBodySide,
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
): { distance: number; along: number } {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  const raw = lengthSq > 0 ? ((px - ax) * abx + (py - ay) * aby) / lengthSq : 0;
  const along = Math.max(0, Math.min(1, raw));
  const closestX = ax + abx * along;
  const closestY = ay + aby * along;
  return { distance: Math.hypot(px - closestX, py - closestY), along };
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

  const outer = calibration.influenceRadiusPx;
  const inner = Math.max(1, outer - calibration.featherPx);
  const radial = 1 - smoothstep01((sample.distance - inner) / Math.max(1, outer - inner));
  const shoulderFade = smoothstep01(sample.along / 0.12);
  const elbowFade = smoothstep01((1 - sample.along) / 0.14);
  return Math.max(0, Math.min(1, radial * shoulderFade * elbowFade));
}

function sourceToWorld(x: number, y: number): { x: number; y: number } {
  return {
    x: (x / NYX_2D_MASTER.width - 0.5) * MASTER_ASPECT,
    y: 0.5 - y / NYX_2D_MASTER.height,
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

export function createNyx2DBodyGeometryRig(): Nyx2DBodyGeometryRig {
  // 17 × 33 = 561 vertices. This resolves each upper arm independently while
  // remaining comfortably below the production geometry/triangle budget.
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
}

export function applyNyx2DBreathPose(
  rig: Nyx2DBodyGeometryRig,
  pose: Nyx2DBreathPose,
  articulation: Nyx2DTorsoArticulation = { yaw: 0, shiftX: 0, leanDeg: 0 },
): void {
  const position = rig.geometry.getAttribute('position') as THREE.BufferAttribute;
  const array = position.array as Float32Array;
  const torso = NYX_2D_RIG_ZONES.torso;
  const centerX = ((torso.left + torso.right) * 0.5 - 0.5) * MASTER_ASPECT;
  const centerY = (torso.bottom + torso.top) * 0.5 - 0.5;
  const yaw = clampNyx2DTorsoYaw(articulation.yaw);
  const shiftX = clampNyx2DTorsoShiftX(articulation.shiftX);
  const leanDeg = clampNyx2DTorsoLeanDeg(articulation.leanDeg);
  const squeeze = 1 - Math.abs(yaw) * 0.055;
  const leanTan = Math.tan(leanDeg * DEG_TO_RAD);
  const leftShoulderDeg = clampNyx2DShoulderDeg(articulation.leftShoulderDeg ?? 0);
  const rightShoulderDeg = clampNyx2DShoulderDeg(articulation.rightShoulderDeg ?? 0);
  const leftShoulder = nyx2DUpperArmCalibration('left').shoulder;
  const rightShoulder = nyx2DUpperArmCalibration('right').shoulder;
  const leftPivot = sourceToWorld(leftShoulder.x, leftShoulder.y);
  const rightPivot = sourceToWorld(rightShoulder.x, rightShoulder.y);

  for (let i = 0; i < position.count; i += 1) {
    const offset = i * 3;
    const neutralX = rig.neutralPositions[offset];
    const neutralY = rig.neutralPositions[offset + 1];
    const weight = rig.torsoWeights[i];

    const breathedX = neutralX + (neutralX - centerX) * (pose.scaleX - 1) * weight;
    const breathedY =
      neutralY +
      (pose.translateY + (neutralY - centerY) * (pose.scaleY - 1)) * weight;

    const yawX = centerX + (breathedX - centerX) * squeeze;
    const turnShift = (shiftX + yaw * 0.006) * weight;
    const leanShift = (breathedY - centerY) * leanTan * weight;
    let x = breathedX + (yawX - breathedX) * weight + turnShift - leanShift;
    let y = breathedY;

    const leftWeight = rig.leftUpperArmWeights[i];
    if (leftWeight > 0.0001 && Math.abs(leftShoulderDeg) > 0.0001) {
      const rotated = rotateAround(
        x,
        y,
        leftPivot.x,
        leftPivot.y,
        leftShoulderDeg * leftWeight * DEG_TO_RAD,
      );
      x = rotated.x;
      y = rotated.y;
    }

    const rightWeight = rig.rightUpperArmWeights[i];
    if (rightWeight > 0.0001 && Math.abs(rightShoulderDeg) > 0.0001) {
      const rotated = rotateAround(
        x,
        y,
        rightPivot.x,
        rightPivot.y,
        rightShoulderDeg * rightWeight * DEG_TO_RAD,
      );
      x = rotated.x;
      y = rotated.y;
    }

    array[offset] = x;
    array[offset + 1] = y;
    array[offset + 2] = rig.neutralPositions[offset + 2];
  }

  position.needsUpdate = true;
}
