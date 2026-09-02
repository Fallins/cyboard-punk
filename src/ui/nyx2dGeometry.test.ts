import { describe, expect, it } from 'vitest';
import { applyNyx2DBreathPose, createNyx2DBodyGeometryRig, resetNyx2DBodyGeometry } from './nyx2dGeometry';

describe('NYX 2D torso geometry', () => {
  it('stays well below the prototype vertex budget', () => {
    const rig = createNyx2DBodyGeometryRig();
    expect(rig.geometry.getAttribute('position').count).toBe(153);
    rig.geometry.dispose();
  });

  it('weights only a subset of vertices for breathing', () => {
    const rig = createNyx2DBodyGeometryRig();
    const weighted = Array.from(rig.torsoWeights).filter((weight) => weight > 0);
    expect(weighted.length).toBeGreaterThan(0);
    expect(weighted.length).toBeLessThan(rig.torsoWeights.length);
    rig.geometry.dispose();
  });

  it('can deform and restore the persistent geometry without rebuilding it', () => {
    const rig = createNyx2DBodyGeometryRig();
    const position = rig.geometry.getAttribute('position');
    const before = Array.from(position.array as ArrayLike<number>);

    applyNyx2DBreathPose(rig, { translateY: 0.002, scaleX: 1.001, scaleY: 1.003 });
    const deformed = Array.from(position.array as ArrayLike<number>);
    expect(deformed).not.toEqual(before);

    resetNyx2DBodyGeometry(rig);
    expect(Array.from(position.array as ArrayLike<number>)).toEqual(before);
    rig.geometry.dispose();
  });
});
