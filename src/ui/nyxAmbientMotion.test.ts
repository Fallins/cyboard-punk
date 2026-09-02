import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createNyxAmbientController, sampleNyxAmbientMotion } from './nyxAmbientMotion';

describe('NYX ambient motion', () => {
  it('keeps idle gaze and breath inside subtle production-safe bounds', () => {
    for (let index = 0; index < 120; index += 1) {
      const sample = sampleNyxAmbientMotion(index / 10, 'idle');
      expect(Math.abs(sample.headYaw)).toBeLessThanOrEqual((1.6 * Math.PI) / 180 + 1e-9);
      expect(Math.abs(sample.headPitch)).toBeLessThanOrEqual((0.9 * Math.PI) / 180 + 1e-9);
      expect(Math.abs(sample.spinePitch)).toBeLessThanOrEqual((0.34 * Math.PI) / 180 + 1e-9);
      expect(sample.leftArmPitch).toBe(0);
      expect(sample.rightArmPitch).toBe(0);
      expect(sample.leftForearmPitch).toBe(0);
      expect(sample.rightForearmPitch).toBe(0);
    }
  });

  it('makes processing posture readable at dashboard scale', () => {
    const samples = Array.from({ length: 80 }, (_, index) => sampleNyxAmbientMotion(index / 10, 'processing'));
    const maxLeftArmPitch = Math.max(...samples.map((sample) => Math.abs(sample.leftArmPitch)));
    const maxRightArmPitch = Math.max(...samples.map((sample) => Math.abs(sample.rightArmPitch)));
    const maxLeftForearmPitch = Math.max(...samples.map((sample) => Math.abs(sample.leftForearmPitch)));
    const maxRightForearmPitch = Math.max(...samples.map((sample) => Math.abs(sample.rightForearmPitch)));
    const maxSpinePitch = Math.max(...samples.map((sample) => Math.abs(sample.spinePitch)));

    expect(maxLeftArmPitch).toBeGreaterThan((10 * Math.PI) / 180);
    expect(maxRightArmPitch).toBeGreaterThan((10 * Math.PI) / 180);
    expect(maxLeftForearmPitch).toBeGreaterThan((18 * Math.PI) / 180);
    expect(maxRightForearmPitch).toBeGreaterThan((18 * Math.PI) / 180);
    expect(maxSpinePitch).toBeGreaterThan((3 * Math.PI) / 180);
  });

  it('gives observing more gaze range than processing', () => {
    const observing = Array.from({ length: 80 }, (_, index) => sampleNyxAmbientMotion(index / 10, 'observing'));
    const processing = Array.from({ length: 80 }, (_, index) => sampleNyxAmbientMotion(index / 10, 'processing'));
    const observingYaw = Math.max(...observing.map((sample) => Math.abs(sample.headYaw)));
    const processingYaw = Math.max(...processing.map((sample) => Math.abs(sample.headYaw)));

    expect(observingYaw).toBeGreaterThan(processingYaw);
  });

  it('reduces ambient movement while offline', () => {
    const idle = sampleNyxAmbientMotion(3.7, 'idle');
    const offline = sampleNyxAmbientMotion(3.7, 'offline');

    expect(Math.abs(offline.headYaw)).toBeLessThan(Math.abs(idle.headYaw));
  });

  it('returns finite values for invalid elapsed input', () => {
    const sample = sampleNyxAmbientMotion(Number.NaN, 'processing');
    expect(Object.values(sample).every(Number.isFinite)).toBe(true);
  });

  it('adds and removes processing offsets around AnimationMixer updates', () => {
    const root = new THREE.Group();
    const spine = new THREE.Bone();
    spine.name = 'Spine01';
    const head = new THREE.Bone();
    head.name = 'Head';
    const leftArm = new THREE.Bone();
    leftArm.name = 'LeftArm';
    const rightArm = new THREE.Bone();
    rightArm.name = 'RightArm';
    const leftForearm = new THREE.Bone();
    leftForearm.name = 'LeftForeArm';
    const rightForearm = new THREE.Bone();
    rightForearm.name = 'RightForeArm';
    root.add(spine, leftArm, rightArm, leftForearm, rightForearm);
    spine.add(head);

    const controller = createNyxAmbientController(root);
    const bases = [head, spine, leftArm, rightArm, leftForearm, rightForearm].map((bone) => bone.quaternion.clone());

    controller.apply(2.5, 'processing');
    expect(head.quaternion.angleTo(bases[0]!)).toBeGreaterThan(0);
    expect(spine.quaternion.angleTo(bases[1]!)).toBeGreaterThan(0);
    expect(leftArm.quaternion.angleTo(bases[2]!)).toBeGreaterThan((8 * Math.PI) / 180);
    expect(rightArm.quaternion.angleTo(bases[3]!)).toBeGreaterThan((8 * Math.PI) / 180);
    expect(leftForearm.quaternion.angleTo(bases[4]!)).toBeGreaterThan((15 * Math.PI) / 180);
    expect(rightForearm.quaternion.angleTo(bases[5]!)).toBeGreaterThan((15 * Math.PI) / 180);

    controller.prepare();
    [head, spine, leftArm, rightArm, leftForearm, rightForearm].forEach((bone, index) => {
      expect(bone.quaternion.angleTo(bases[index]!)).toBeLessThan(1e-7);
    });
  });

  it('degrades safely when expected bones are missing', () => {
    const controller = createNyxAmbientController(new THREE.Group());
    expect(controller.hasGaze).toBe(false);
    expect(controller.hasBreath).toBe(false);
    expect(controller.hasStateMotion).toBe(false);
    expect(() => {
      controller.prepare();
      controller.apply(1, 'idle');
    }).not.toThrow();
  });
});
