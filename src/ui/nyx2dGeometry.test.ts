import { describe, expect, it } from 'vitest';
import { applyNyx2DBreathPose, createNyx2DBodyGeometryRig, resetNyx2DBodyGeometry } from './nyx2dGeometry';

describe('NYX 2D torso and upper-arm geometry', () => {
  it('stays below the production vertex budget while resolving both upper arms', () => {
    const rig = createNyx2DBodyGeometryRig();
    expect(rig.geometry.getAttribute('position').count).toBe(561);
    rig.geometry.dispose();
  });

  it('weights only subsets of vertices for torso and each upper arm', () => {
    const rig = createNyx2DBodyGeometryRig();
    const torso = Array.from(rig.torsoWeights).filter((weight) => weight > 0);
    const left = Array.from(rig.leftUpperArmWeights).filter((weight) => weight > 0);
    const right = Array.from(rig.rightUpperArmWeights).filter((weight) => weight > 0);

    expect(torso.length).toBeGreaterThan(0);
    expect(torso.length).toBeLessThan(rig.torsoWeights.length);
    expect(left.length).toBeGreaterThan(0);
    expect(left.length).toBeLessThan(rig.leftUpperArmWeights.length);
    expect(right.length).toBeGreaterThan(0);
    expect(right.length).toBeLessThan(rig.rightUpperArmWeights.length);
    rig.geometry.dispose();
  });

  it('can deform and restore persistent geometry without rebuilding it', () => {
    const rig = createNyx2DBodyGeometryRig();
    const position = rig.geometry.getAttribute('position');
    const before = Array.from(position.array as ArrayLike<number>);

    applyNyx2DBreathPose(
      rig,
      { translateY: 0.002, scaleX: 1.001, scaleY: 1.003 },
      { yaw: 0.1, shiftX: 0.001, leanDeg: 0.25, leftShoulderDeg: -4, rightShoulderDeg: 5 },
    );
    const deformed = Array.from(position.array as ArrayLike<number>);
    expect(deformed).not.toEqual(before);

    resetNyx2DBodyGeometry(rig);
    expect(Array.from(position.array as ArrayLike<number>)).toEqual(before);
    rig.geometry.dispose();
  });
});
