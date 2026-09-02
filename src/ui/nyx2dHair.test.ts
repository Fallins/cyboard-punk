import { describe, expect, it } from 'vitest';
import {
  createNyx2DHairSpringState,
  nyx2DHairMaxAngleRad,
  nyx2DHairTargetFromHead,
  resetNyx2DHairSpring,
  stepNyx2DHairSpring,
} from './nyx2dHair';

describe('NYX 2D hair spring', () => {
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
