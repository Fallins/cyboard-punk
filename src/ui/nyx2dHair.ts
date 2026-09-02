import type { Nyx2DHeadPose } from './nyx2dMotion';
import { NYX_2D_MOTION_ENVELOPES } from './nyx2dRig';
import type { OperatorRuntimeState } from './operatorRuntime';

export interface Nyx2DHairSpringState {
  angleRad: number;
  angularVelocity: number;
}

const DEG_TO_RAD = Math.PI / 180;
const MAX_ANGLE_RAD = NYX_2D_MOTION_ENVELOPES.hair.rotationDeg * DEG_TO_RAD;
const STIFFNESS = 34;
const DAMPING = 10.5;
const MAX_DT_SECONDS = 1 / 20;

export function nyx2DHairMotionEnabled(value?: string): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on';
}

export function nyx2DShouldAnimateHair(
  state: OperatorRuntimeState,
  active: boolean,
  reducedMotion: boolean,
  featureEnabled: boolean,
): boolean {
  return featureEnabled && active && !reducedMotion && state !== 'offline';
}

export function createNyx2DHairSpringState(): Nyx2DHairSpringState {
  return { angleRad: 0, angularVelocity: 0 };
}

export function resetNyx2DHairSpring(state: Nyx2DHairSpringState): void {
  state.angleRad = 0;
  state.angularVelocity = 0;
}

export function nyx2DHairTargetFromHead(pose: Nyx2DHeadPose): number {
  // Hair follows opposite to head roll and horizontal travel with a much smaller
  // amplitude. Translation contribution is normalized against the declared head
  // envelope so the driver remains stable if display size changes.
  const headEnvelope = NYX_2D_MOTION_ENVELOPES.head;
  const normalizedX = headEnvelope.translateX > 0 ? pose.x / headEnvelope.translateX : 0;
  const target = -pose.rotationRad * 0.34 - normalizedX * MAX_ANGLE_RAD * 0.18;
  return Math.max(-MAX_ANGLE_RAD, Math.min(MAX_ANGLE_RAD, target));
}

export function nyx2DHairAmbientTarget(elapsedMs: number): number {
  const t = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0) / 1000;
  // Tiny independent drift prevents perfectly static hair when the head happens
  // to cross neutral. It remains well below the follow-through envelope.
  return Math.sin(t * Math.PI * 2 * 0.19) * MAX_ANGLE_RAD * 0.16;
}

export function stepNyx2DHairSpring(
  state: Nyx2DHairSpringState,
  targetAngleRad: number,
  dtSeconds: number,
): void {
  const dt = Math.max(0, Math.min(MAX_DT_SECONDS, Number.isFinite(dtSeconds) ? dtSeconds : 0));
  if (dt <= 0) return;

  const target = Math.max(-MAX_ANGLE_RAD, Math.min(MAX_ANGLE_RAD, targetAngleRad));
  const acceleration = (target - state.angleRad) * STIFFNESS - state.angularVelocity * DAMPING;
  state.angularVelocity += acceleration * dt;
  state.angleRad += state.angularVelocity * dt;

  if (state.angleRad > MAX_ANGLE_RAD) {
    state.angleRad = MAX_ANGLE_RAD;
    state.angularVelocity = Math.min(0, state.angularVelocity);
  } else if (state.angleRad < -MAX_ANGLE_RAD) {
    state.angleRad = -MAX_ANGLE_RAD;
    state.angularVelocity = Math.max(0, state.angularVelocity);
  }
}

export function nyx2DHairMaxAngleRad(): number {
  return MAX_ANGLE_RAD;
}
