import * as THREE from 'three';
import type { OperatorRuntimeState } from './operatorRuntime';

const DEGREE = Math.PI / 180;

interface NyxAmbientProfile {
  gazeAmplitude: number;
  gazeSpeed: number;
  breathAmplitude: number;
  breathSpeed: number;
}

const PROFILES: Record<OperatorRuntimeState, NyxAmbientProfile> = {
  idle: { gazeAmplitude: 1, gazeSpeed: 1, breathAmplitude: 1, breathSpeed: 1 },
  observing: { gazeAmplitude: 1.35, gazeSpeed: 1.2, breathAmplitude: 0.82, breathSpeed: 1.08 },
  processing: { gazeAmplitude: 0.78, gazeSpeed: 1.35, breathAmplitude: 0.72, breathSpeed: 1.18 },
  warning: { gazeAmplitude: 0.46, gazeSpeed: 1.08, breathAmplitude: 0.58, breathSpeed: 1.12 },
  success: { gazeAmplitude: 0.68, gazeSpeed: 0.92, breathAmplitude: 0.9, breathSpeed: 1.02 },
  offline: { gazeAmplitude: 0.12, gazeSpeed: 0.48, breathAmplitude: 0.24, breathSpeed: 0.58 },
};

export interface NyxAmbientMotionSample {
  headPitch: number;
  headYaw: number;
  headRoll: number;
  spinePitch: number;
  spineRoll: number;
}

export interface NyxAmbientController {
  readonly hasGaze: boolean;
  readonly hasBreath: boolean;
  prepare(): void;
  apply(elapsedSeconds: number, state: OperatorRuntimeState): void;
}

export function sampleNyxAmbientMotion(
  elapsedSeconds: number,
  state: OperatorRuntimeState,
  output: NyxAmbientMotionSample = {
    headPitch: 0,
    headYaw: 0,
    headRoll: 0,
    spinePitch: 0,
    spineRoll: 0,
  },
): NyxAmbientMotionSample {
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const profile = PROFILES[state];
  const gazeTime = elapsed * profile.gazeSpeed;
  const breathTime = elapsed * profile.breathSpeed;

  const horizontalGaze = Math.sin(gazeTime * 0.53 + 0.4) * 0.72 + Math.sin(gazeTime * 0.19 + 2.1) * 0.28;
  const verticalGaze = Math.sin(gazeTime * 0.41 + 1.2) * 0.75 + Math.sin(gazeTime * 0.17 + 0.2) * 0.25;
  const rollGaze = Math.sin(gazeTime * 0.29 + 2.6);
  const breath = Math.sin(breathTime * 0.92 + 0.35);

  output.headYaw = horizontalGaze * 1.6 * DEGREE * profile.gazeAmplitude;
  output.headPitch = verticalGaze * 0.9 * DEGREE * profile.gazeAmplitude;
  output.headRoll = rollGaze * 0.45 * DEGREE * profile.gazeAmplitude;
  output.spinePitch = breath * 0.34 * DEGREE * profile.breathAmplitude;
  output.spineRoll = Math.sin(breathTime * 0.46 + 1.1) * 0.1 * DEGREE * profile.breathAmplitude;
  return output;
}

export function createNyxAmbientController(root: THREE.Object3D): NyxAmbientController {
  const head = root.getObjectByName('Head');
  const spine = root.getObjectByName('Spine01');
  const sample: NyxAmbientMotionSample = {
    headPitch: 0,
    headYaw: 0,
    headRoll: 0,
    spinePitch: 0,
    spineRoll: 0,
  };
  const headEuler = new THREE.Euler(0, 0, 0, 'XYZ');
  const spineEuler = new THREE.Euler(0, 0, 0, 'XYZ');
  const headOffset = new THREE.Quaternion();
  const spineOffset = new THREE.Quaternion();
  const previousHeadOffset = new THREE.Quaternion();
  const previousSpineOffset = new THREE.Quaternion();
  const inverseOffset = new THREE.Quaternion();
  let applied = false;

  const prepare = () => {
    if (!applied) return;
    if (head) {
      inverseOffset.copy(previousHeadOffset).invert();
      head.quaternion.multiply(inverseOffset).normalize();
    }
    if (spine) {
      inverseOffset.copy(previousSpineOffset).invert();
      spine.quaternion.multiply(inverseOffset).normalize();
    }
    applied = false;
  };

  return {
    hasGaze: Boolean(head),
    hasBreath: Boolean(spine),
    prepare,
    apply(elapsedSeconds, state) {
      sampleNyxAmbientMotion(elapsedSeconds, state, sample);

      if (head) {
        headEuler.set(sample.headPitch, sample.headYaw, sample.headRoll, 'XYZ');
        headOffset.setFromEuler(headEuler);
        head.quaternion.multiply(headOffset).normalize();
        previousHeadOffset.copy(headOffset);
      }

      if (spine) {
        spineEuler.set(sample.spinePitch, 0, sample.spineRoll, 'XYZ');
        spineOffset.setFromEuler(spineEuler);
        spine.quaternion.multiply(spineOffset).normalize();
        previousSpineOffset.copy(spineOffset);
      }

      applied = Boolean(head || spine);
    },
  };
}
