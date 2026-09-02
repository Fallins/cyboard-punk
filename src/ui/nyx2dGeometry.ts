import * as THREE from 'three';
import type { Nyx2DBreathPose } from './nyx2dBreath';
import { NYX_2D_MASTER, NYX_2D_RIG_ZONES } from './nyx2dRig';

export interface Nyx2DBodyGeometryRig {
  geometry: THREE.PlaneGeometry;
  neutralPositions: Float32Array;
  torsoWeights: Float32Array;
}

export interface Nyx2DTorsoArticulation {
  yaw: number;
  shiftX: number;
  leanDeg: number;
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

export function createNyx2DBodyGeometryRig(): Nyx2DBodyGeometryRig {
  // 9 × 17 = 153 vertices. Enough vertical resolution for a soft torso breath
  // and a restrained 2.5D torso yaw while remaining far below the prototype
  // geometry budget.
  const geometry = new THREE.PlaneGeometry(MASTER_ASPECT, 1, 8, 16);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const neutralPositions = new Float32Array(position.array as ArrayLike<number>);
  const torsoWeights = new Float32Array(position.count);
  const torso = NYX_2D_RIG_ZONES.torso;

  for (let i = 0; i < position.count; i += 1) {
    torsoWeights[i] = featheredRectWeight(uv.getX(i), uv.getY(i), torso);
  }

  return { geometry, neutralPositions, torsoWeights };
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
  const yaw = Math.max(-1, Math.min(1, articulation.yaw));
  const squeeze = 1 - Math.abs(yaw) * 0.055;
  const leanTan = Math.tan(articulation.leanDeg * DEG_TO_RAD);

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
    const turnShift = (articulation.shiftX + yaw * 0.006) * weight;
    const leanShift = (breathedY - centerY) * leanTan * weight;

    array[offset] = breathedX + (yawX - breathedX) * weight + turnShift - leanShift;
    array[offset + 1] = breathedY;
    array[offset + 2] = rig.neutralPositions[offset + 2];
  }

  position.needsUpdate = true;
}
