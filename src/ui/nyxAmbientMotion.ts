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
  leftArmPitch: number;
  leftArmRoll: number;
  rightArmPitch: number;
  rightArmRoll: number;
  leftForearmPitch: number;
  leftForearmRoll: number;
  rightForearmPitch: number;
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
    leftArmPitch: 0,
    leftArmRoll: 0,
    rightArmPitch: 0,
    rightArmRoll: 0,
    leftForearmPitch: 0,
    leftForearmRoll: 0,
    rightForearmPitch: 0,
    rightForearmRoll: 0,
  };
}

function applyStateMotion(output: NyxAmbientMotionSample, elapsed: number, state: OperatorRuntimeState): void {
  switch (state) {
    case 'observing': {
      output.spinePitch += -1.25 * DEGREE;
      output.spineYaw += Math.sin(elapsed * 0.72) * 1.8 * DEGREE;
      output.headYaw += Math.sin(elapsed * 0.72 + 0.45) * 2.4 * DEGREE;
      output.leftArmPitch = (-4 + Math.sin(elapsed * 1.05) * 1.2) * DEGREE;
      output.rightArmPitch = (-4 + Math.sin(elapsed * 1.05 + 0.8) * 1.2) * DEGREE;
      output.leftForearmPitch = (-5 + Math.sin(elapsed * 1.35) * 1.6) * DEGREE;
      output.rightForearmPitch = (-5 + Math.sin(elapsed * 1.35 + 0.7) * 1.6) * DEGREE;
      break;
    }
    case 'processing': {
      // Make the working state readable even when NYX is rendered small in the
      // dashboard: lift both upper arms, bend the elbows toward an imaginary
      // holographic console, then add asymmetric hand activity.
      const work = Math.sin(elapsed * 2.15);
      const alternate = Math.sin(elapsed * 2.15 + Math.PI * 0.72);
      output.spinePitch += (-4.2 + Math.sin(elapsed * 1.12) * 0.65) * DEGREE;
      output.spineYaw += Math.sin(elapsed * 0.78) * 0.9 * DEGREE;
      output.spineRoll += Math.sin(elapsed * 1.05 + 0.4) * 0.42 * DEGREE;
      output.headPitch += (-2.2 + Math.sin(elapsed * 1.45) * 0.45) * DEGREE;

      output.leftArmPitch = (-13.5 + work * 2.2) * DEGREE;
      output.rightArmPitch = (-13.5 + alternate * 2.2) * DEGREE;
      output.leftArmRoll = (-7.5 + Math.sin(elapsed * 1.4) * 1.4) * DEGREE;
      output.rightArmRoll = (7.5 - Math.sin(elapsed * 1.4 + 0.65) * 1.4) * DEGREE;

      output.leftForearmPitch = (-24 + work * 5.5) * DEGREE;
      output.rightForearmPitch = (-24 + alternate * 5.5) * DEGREE;
      output.leftForearmRoll = (8 + Math.sin(elapsed * 2.65) * 3.2) * DEGREE;
      output.rightForearmRoll = (-8 - Math.sin(elapsed * 2.65 + 0.9) * 3.2) * DEGREE;
      break;
    }
    case 'warning': {
      output.spinePitch += 2.8 * DEGREE;
      output.spineYaw += Math.sin(elapsed * 1.5) * 0.55 * DEGREE;
      output.headPitch += (-2 + Math.sin(elapsed * 2.4) * 0.75) * DEGREE;
      output.leftArmPitch = -6 * DEGREE;
      output.rightArmPitch = -6 * DEGREE;
      output.leftArmRoll = -4 * DEGREE;
      output.rightArmRoll = 4 * DEGREE;
      output.leftForearmPitch = (-10 + Math.sin(elapsed * 2.8) * 2.2) * DEGREE;
      output.rightForearmPitch = (-10 + Math.sin(elapsed * 2.8 + 0.45) * 2.2) * DEGREE;
      break;
    }
    case 'success': {
      output.spinePitch += -1.2 * DEGREE;
      output.headPitch += Math.sin(elapsed * 3.2) * 2.1 * DEGREE;
      output.leftArmPitch = -3.5 * DEGREE;
      output.rightArmPitch = -3.5 * DEGREE;
      output.leftForearmPitch = (-6 + Math.sin(elapsed * 2.2) * 1.4) * DEGREE;
      output.rightForearmPitch = (-6 + Math.sin(elapsed * 2.2 + 0.6) * 1.4) * DEGREE;
      break;
    }
    case 'offline': {
      output.spinePitch += 3.2 * DEGREE;
      output.headPitch += 2.2 * DEGREE;
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
  output.leftArmPitch = 0;
  output.leftArmRoll = 0;
  output.rightArmPitch = 0;
  output.rightArmRoll = 0;
  output.leftForearmPitch = 0;
  output.leftForearmRoll = 0;
  output.rightForearmPitch = 0;
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
  const leftArm = createBoneOffset(root.getObjectByName('LeftArm'));
  const rightArm = createBoneOffset(root.getObjectByName('RightArm'));
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
    removePrevious(leftArm);
    removePrevious(rightArm);
    removePrevious(leftForearm);
    removePrevious(rightForearm);
    applied = false;
  };

  return {
    hasGaze: Boolean(head.bone),
    hasBreath: Boolean(spine.bone),
    hasStateMotion: Boolean(spine.bone || leftArm.bone || rightArm.bone || leftForearm.bone || rightForearm.bone),
    prepare,
    apply(elapsedSeconds, state) {
      sampleNyxAmbientMotion(elapsedSeconds, state, sample);
      applyOffset(head, sample.headPitch, sample.headYaw, sample.headRoll);
      applyOffset(spine, sample.spinePitch, sample.spineYaw, sample.spineRoll);
      applyOffset(leftArm, sample.leftArmPitch, 0, sample.leftArmRoll);
      applyOffset(rightArm, sample.rightArmPitch, 0, sample.rightArmRoll);
      applyOffset(leftForearm, sample.leftForearmPitch, 0, sample.leftForearmRoll);
      applyOffset(rightForearm, sample.rightForearmPitch, 0, sample.rightForearmRoll);
      applied = Boolean(
        head.bone ||
          spine.bone ||
          leftArm.bone ||
          rightArm.bone ||
          leftForearm.bone ||
          rightForearm.bone,
      );
    },
  };
}
