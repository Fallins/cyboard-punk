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

  it('follows opposite to a head turn', () => {
    const target = nyx2DHairTargetFromHead({ x: 0.004, y: 0, rotationRad: 0.01 });
    expect(target).toBeLessThan(0);
  });

  it('keeps ambient drift inside a small fraction of the envelope', () => {
    const max = nyx2DHairMaxAngleRad();
    for (let time = 0; time <= 30000; time += 137) {
      expect(Math.abs(nyx2DHairAmbientTarget(time))).toBeLessThanOrEqual(max * 0.16 + 1e-8);
    }
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
