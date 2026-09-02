import { describe, expect, it } from 'vitest';
import {
  createNyx2DHairSpringState,
  nyx2DHairAmbientTarget,
  nyx2DHairMaxAngleRad,
  nyx2DHairMotionEnabled,
  nyx2DHairTargetFromHead,
  nyx2DShouldAnimateHair,
  resetNyx2DHairSpring,
  stepNyx2DHairSpring,
} from './nyx2dHair';

describe('NYX 2D hair spring', () => {
  it('is opt-in and respects lifecycle', () => {
    expect(nyx2DHairMotionEnabled('1')).toBe(true);
    expect(nyx2DHairMotionEnabled('true')).toBe(true);
    expect(nyx2DHairMotionEnabled(undefined)).toBe(false);
    expect(nyx2DShouldAnimateHair('idle', true, false, true)).toBe(true);
    expect(nyx2DShouldAnimateHair('idle', false, false, true)).toBe(false);
    expect(nyx2DShouldAnimateHair('idle', true, true, true)).toBe(false);
    expect(nyx2DShouldAnimateHair('offline', true, false, true)).toBe(false);
  });

  it('starts and resets at neutral', () => {
    const state = createNyx2DHairSpringState();
    expect(state).toEqual({ angleRad: 0, angularVelocity: 0 });
    state.angleRad = 0.01;
    state.angularVelocity = 0.4;
    resetNyx2DHairSpring(state);
    expect(state).toEqual({ angleRad: 0, angularVelocity: 0 });
  });

  it('follows opposite to a head turn with rotation as the primary driver', () => {
    const rotationOnly = nyx2DHairTargetFromHead({ x: 0, y: 0, rotationRad: 0.01 });
    const translationOnly = nyx2DHairTargetFromHead({ x: 0.004, y: 0, rotationRad: 0 });
    expect(rotationOnly).toBeLessThan(0);
    expect(Math.abs(rotationOnly)).toBeGreaterThan(Math.abs(translationOnly));
  });

  it('does not drift independently while the head is holding still', () => {
    for (let time = 0; time <= 30000; time += 137) {
      expect(nyx2DHairAmbientTarget(time)).toBe(0);
    }
  });

  it('settles toward neutral after the head stops moving', () => {
    const state = createNyx2DHairSpringState();
    for (let i = 0; i < 18; i += 1) stepNyx2DHairSpring(state, -0.012, 1 / 30);
    const displaced = Math.abs(state.angleRad);
    expect(displaced).toBeGreaterThan(0.001);

    for (let i = 0; i < 90; i += 1) stepNyx2DHairSpring(state, 0, 1 / 30);
    expect(Math.abs(state.angleRad)).toBeLessThan(displaced * 0.12);
  });

  it('stays bounded even after a very large requested target', () => {
    const state = createNyx2DHairSpringState();
    for (let i = 0; i < 600; i += 1) stepNyx2DHairSpring(state, 99, 1 / 30);
    expect(Math.abs(state.angleRad)).toBeLessThanOrEqual(nyx2DHairMaxAngleRad() + 1e-8);
  });

  it('clamps large resume delta instead of exploding the spring', () => {
    const normal = createNyx2DHairSpringState();
    const hugeDelta = createNyx2DHairSpringState();
    stepNyx2DHairSpring(normal, 0.01, 1 / 20);
    stepNyx2DHairSpring(hugeDelta, 0.01, 30);
    expect(hugeDelta.angleRad).toBeCloseTo(normal.angleRad, 10);
    expect(hugeDelta.angularVelocity).toBeCloseTo(normal.angularVelocity, 10);
  });
});
