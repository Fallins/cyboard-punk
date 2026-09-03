import { describe, expect, it } from 'vitest';
import { coordinateNyx2DArticulationBySide } from './nyx2dArticulation';

describe('NYX continuous attention → articulation handoff', () => {
  it('moves PROCESS from center/right toward left without a one-frame limb swap', () => {
    const center = coordinateNyx2DArticulationBySide('processing', 0);
    const quarterLeft = coordinateNyx2DArticulationBySide('processing', -0.25);
    const halfLeft = coordinateNyx2DArticulationBySide('processing', -0.5);
    const left = coordinateNyx2DArticulationBySide('processing', -1);

    expect(center.left.elbowDeg).toBe(0);
    expect(center.right.elbowDeg).toBe(-98);

    expect(quarterLeft.left.elbowDeg).toBeGreaterThan(0);
    expect(quarterLeft.left.elbowDeg).toBeLessThan(halfLeft.left.elbowDeg);
    expect(Math.abs(quarterLeft.right.elbowDeg)).toBeGreaterThan(Math.abs(halfLeft.right.elbowDeg));

    expect(halfLeft.left.elbowDeg).toBeCloseTo(49, 6);
    expect(halfLeft.right.elbowDeg).toBeCloseTo(-49, 6);
    expect(halfLeft.torsoShiftX).toBeCloseTo(0, 8);

    expect(left.left.elbowDeg).toBe(98);
    expect(left.right.elbowDeg).toBe(0);
    expect(left.torsoShiftX).toBeLessThan(0);
  });

  it('keeps a right-side PROCESS target identical to the established center/right baseline', () => {
    const center = coordinateNyx2DArticulationBySide('processing', 0);
    const halfRight = coordinateNyx2DArticulationBySide('processing', 0.5);
    const right = coordinateNyx2DArticulationBySide('processing', 1);

    expect(halfRight).toEqual(center);
    expect(right).toEqual(center);
  });

  it('keeps WARNING bilateral at every continuous provider-side mix', () => {
    for (const sideMix of [-1, -0.5, 0, 0.5, 1]) {
      const pose = coordinateNyx2DArticulationBySide('warning', sideMix);
      expect(pose.left.elbowDeg).toBeGreaterThan(0);
      expect(pose.right.elbowDeg).toBeLessThan(0);
    }
  });
});
