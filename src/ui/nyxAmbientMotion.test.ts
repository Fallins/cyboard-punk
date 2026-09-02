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
    }
  });

  it('reduces ambient movement while offline', () => {
    const idle = sampleNyxAmbientMotion(3.7, 'idle');
    const offline = sampleNyxAmbientMotion(3.7, 'offline');

    expect(Math.abs(offline.headYaw)).toBeLessThan(Math.abs(idle.headYaw));
    expect(Math.abs(offline.spinePitch)).toBeLessThan(Math.abs(idle.spinePitch));
  });

  it('returns finite values for invalid elapsed input', () => {
    const sample = sampleNyxAmbientMotion(Number.NaN, 'processing');
    expect(Object.values(sample).every(Number.isFinite)).toBe(true);
  });

  it('adds and removes the previous offset around AnimationMixer updates', () => {
    const root = new THREE.Group();
    const head = new THREE.Bone();
    head.name = 'Head';
    const spine = new THREE.Bone();
    spine.name = 'Spine01';
    root.add(spine);
    spine.add(head);

    const controller = createNyxAmbientController(root);
    const baseHead = head.quaternion.clone();
    const baseSpine = spine.quaternion.clone();

    controller.apply(2.5, 'idle');
    expect(head.quaternion.angleTo(baseHead)).toBeGreaterThan(0);
    expect(spine.quaternion.angleTo(baseSpine)).toBeGreaterThan(0);

    controller.prepare();
    expect(head.quaternion.angleTo(baseHead)).toBeLessThan(1e-7);
    expect(spine.quaternion.angleTo(baseSpine)).toBeLessThan(1e-7);
  });

  it('degrades safely when expected bones are missing', () => {
    const controller = createNyxAmbientController(new THREE.Group());
    expect(controller.hasGaze).toBe(false);
    expect(controller.hasBreath).toBe(false);
    expect(() => {
      controller.prepare();
      controller.apply(1, 'idle');
    }).not.toThrow();
  });
});
