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
  observing: { gazeAmplitude: 2.15, gazeSpeed: 1.25, breathAmplitude: 0.82, breathSpeed: 1.08 },
  processing: { gazeAmplitude: 1.05, gazeSpeed: 1.4, breathAmplitude: 0.78, breathSpeed: 1.2 },
  warning: { gazeAmplitude: 0.72, gazeSpeed: 1.18, breathAmplitude: 0.62, breathSpeed: 1.18 },
  success: { gazeAmplitude: 0.82, gazeSpeed: 0.96, breathAmplitude: 0.92, breathSpeed: 1.04 },
  offline: { gazeAmplitude: 0.12, gazeSpeed: 0.48, breathAmplitude: 0.24, breathSpeed: 0.58 },
};

export interface NyxAmbientMotionSample {
  headPitch: number;
  headYaw: number;
  headRoll: number;
  spinePitch: number;
  spineYaw: number;
  spineRoll: number;
  leftForearmRoll: number;
  rightForearmRoll: number;
}

export interface NyxAmbientController {
  readonly hasGaze: boolean;
  readonly hasBreath: boolean;
  readonly hasStateMotion: boolean;
  prepare(): void;
  apply(elapsedSeconds: number, state: OperatorRuntimeState): void;
}

function emptySample(): NyxAmbientMotionSample {
  return {
    headPitch: 0,
    headYaw: 0,
    headRoll: 0,
    spinePitch: 0,
    spineYaw: 0,
    spineRoll: 0,
    leftForearmRoll: 0,
    rightForearmRoll: 0,
  };
}

function applyStateMotion(output: NyxAmbientMotionSample, elapsed: number, state: OperatorRuntimeState): void {
  switch (state) {
    case 'observing': {
      output.spinePitch += 0.5 * DEGREE;
      output.spineYaw += Math.sin(elapsed * 0.72) * 1.15 * DEGREE;
      output.leftForearmRoll = (2 + Math.sin(elapsed * 1.4) * 1.2) * DEGREE;
      output.rightForearmRoll = (-2 - Math.sin(elapsed * 1.4 + 0.7) * 1.2) * DEGREE;
      break;
    }
    case 'processing': {
      // A restrained command-console pose: slight forward engagement plus
      // alternating forearm motion that stays readable at dashboard scale.
      output.spinePitch += (-2.35 + Math.sin(elapsed * 1.35) * 0.55) * DEGREE;
      output.spineYaw += Math.sin(elapsed * 0.82) * 0.62 * DEGREE;
      output.spineRoll += Math.sin(elapsed * 1.05 + 0.4) * 0.28 * DEGREE;
      output.headPitch += (-0.8 + Math.sin(elapsed * 1.55) * 0.32) * DEGREE;
      output.leftForearmRoll = (9.5 + Math.sin(elapsed * 2.35) * 4.2) * DEGREE;
      output.rightForearmRoll = (-9.5 - Math.sin(elapsed * 2.35 + 0.85) * 4.2) * DEGREE;
      break;
    }
    case 'warning': {
      output.spinePitch += 1.65 * DEGREE;
      output.spineYaw += Math.sin(elapsed * 1.5) * 0.42 * DEGREE;
      output.headPitch += (-1.1 + Math.sin(elapsed * 2.4) * 0.55) * DEGREE;
      output.leftForearmRoll = (4 + Math.sin(elapsed * 2.8) * 1.8) * DEGREE;
      output.rightForearmRoll = (-4 - Math.sin(elapsed * 2.8 + 0.45) * 1.8) * DEGREE;
      break;
    }
    case 'success': {
      output.spinePitch += -0.75 * DEGREE;
      output.headPitch += Math.sin(elapsed * 3.2) * 1.65 * DEGREE;
      output.leftForearmRoll = (3 + Math.sin(elapsed * 2.2) * 1.1) * DEGREE;
      output.rightForearmRoll = (-3 - Math.sin(elapsed * 2.2 + 0.6) * 1.1) * DEGREE;
      break;
    }
    case 'offline': {
      output.spinePitch += 2.2 * DEGREE;
      output.headPitch += 1.4 * DEGREE;
      break;
    }
    case 'idle':
      break;
  }
}

export function sampleNyxAmbientMotion(
  elapsedSeconds: number,
  state: OperatorRuntimeState,
  output: NyxAmbientMotionSample = emptySample(),
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
  output.spineYaw = 0;
  output.spineRoll = Math.sin(breathTime * 0.46 + 1.1) * 0.1 * DEGREE * profile.breathAmplitude;
  output.leftForearmRoll = 0;
  output.rightForearmRoll = 0;

  applyStateMotion(output, elapsed, state);
  return output;
}

interface BoneOffset {
  bone?: THREE.Object3D;
  euler: THREE.Euler;
  offset: THREE.Quaternion;
  previous: THREE.Quaternion;
}

function createBoneOffset(bone?: THREE.Object3D): BoneOffset {
  return {
    bone,
    euler: new THREE.Euler(0, 0, 0, 'XYZ'),
    offset: new THREE.Quaternion(),
    previous: new THREE.Quaternion(),
  };
}

export function createNyxAmbientController(root: THREE.Object3D): NyxAmbientController {
  const head = createBoneOffset(root.getObjectByName('Head'));
  const spine = createBoneOffset(root.getObjectByName('Spine01'));
  const leftForearm = createBoneOffset(root.getObjectByName('LeftForeArm'));
  const rightForearm = createBoneOffset(root.getObjectByName('RightForeArm'));
  const sample = emptySample();
  const inverseOffset = new THREE.Quaternion();
  let applied = false;

  const removePrevious = (target: BoneOffset) => {
    if (!target.bone) return;
    inverseOffset.copy(target.previous).invert();
    target.bone.quaternion.multiply(inverseOffset).normalize();
  };

  const applyOffset = (target: BoneOffset, x: number, y: number, z: number) => {
    if (!target.bone) return;
    target.euler.set(x, y, z, 'XYZ');
    target.offset.setFromEuler(target.euler);
    target.bone.quaternion.multiply(target.offset).normalize();
    target.previous.copy(target.offset);
  };

  const prepare = () => {
    if (!applied) return;
    removePrevious(head);
    removePrevious(spine);
    removePrevious(leftForearm);
    removePrevious(rightForearm);
    applied = false;
  };

  return {
    hasGaze: Boolean(head.bone),
    hasBreath: Boolean(spine.bone),
    hasStateMotion: Boolean(spine.bone || leftForearm.bone || rightForearm.bone),
    prepare,
    apply(elapsedSeconds, state) {
      sampleNyxAmbientMotion(elapsedSeconds, state, sample);
      applyOffset(head, sample.headPitch, sample.headYaw, sample.headRoll);
      applyOffset(spine, sample.spinePitch, sample.spineYaw, sample.spineRoll);
      applyOffset(leftForearm, 0, 0, sample.leftForearmRoll);
      applyOffset(rightForearm, 0, 0, sample.rightForearmRoll);
      applied = Boolean(head.bone || spine.bone || leftForearm.bone || rightForearm.bone);
    },
  };
}
