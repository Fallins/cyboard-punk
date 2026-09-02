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
      expect(sample.leftForearmRoll).toBe(0);
      expect(sample.rightForearmRoll).toBe(0);
    }
  });

  it('makes processing posture readable at dashboard scale', () => {
    const samples = Array.from({ length: 80 }, (_, index) => sampleNyxAmbientMotion(index / 10, 'processing'));
    const maxLeftForearm = Math.max(...samples.map((sample) => Math.abs(sample.leftForearmRoll)));
    const maxRightForearm = Math.max(...samples.map((sample) => Math.abs(sample.rightForearmRoll)));
    const maxSpinePitch = Math.max(...samples.map((sample) => Math.abs(sample.spinePitch)));

    expect(maxLeftForearm).toBeGreaterThan((10 * Math.PI) / 180);
    expect(maxRightForearm).toBeGreaterThan((10 * Math.PI) / 180);
    expect(maxSpinePitch).toBeGreaterThan((1.5 * Math.PI) / 180);
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

  it('adds and removes state offsets around AnimationMixer updates', () => {
    const root = new THREE.Group();
    const spine = new THREE.Bone();
    spine.name = 'Spine01';
    const head = new THREE.Bone();
    head.name = 'Head';
    const leftForearm = new THREE.Bone();
    leftForearm.name = 'LeftForeArm';
    const rightForearm = new THREE.Bone();
    rightForearm.name = 'RightForeArm';
    root.add(spine, leftForearm, rightForearm);
    spine.add(head);

    const controller = createNyxAmbientController(root);
    const baseHead = head.quaternion.clone();
    const baseSpine = spine.quaternion.clone();
    const baseLeft = leftForearm.quaternion.clone();
    const baseRight = rightForearm.quaternion.clone();

    controller.apply(2.5, 'processing');
    expect(head.quaternion.angleTo(baseHead)).toBeGreaterThan(0);
    expect(spine.quaternion.angleTo(baseSpine)).toBeGreaterThan(0);
    expect(leftForearm.quaternion.angleTo(baseLeft)).toBeGreaterThan((5 * Math.PI) / 180);
    expect(rightForearm.quaternion.angleTo(baseRight)).toBeGreaterThan((5 * Math.PI) / 180);

    controller.prepare();
    expect(head.quaternion.angleTo(baseHead)).toBeLessThan(1e-7);
    expect(spine.quaternion.angleTo(baseSpine)).toBeLessThan(1e-7);
    expect(leftForearm.quaternion.angleTo(baseLeft)).toBeLessThan(1e-7);
    expect(rightForearm.quaternion.angleTo(baseRight)).toBeLessThan(1e-7);
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
