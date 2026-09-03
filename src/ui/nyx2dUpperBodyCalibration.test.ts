import { describe, expect, it } from 'vitest';
import { NYX_2D_MASTER } from './nyx2dRig';
import {
  NYX_2D_UPPER_BODY_CALIBRATION,
  clampNyx2DShoulderDeg,
  clampNyx2DTorsoLeanDeg,
  clampNyx2DTorsoShiftX,
  clampNyx2DTorsoYaw,
} from './nyx2dUpperBodyCalibration';

describe('NYX source-guided upper-body calibration', () => {
  it('keeps both shoulder/elbow chains inside canonical master bounds', () => {
    for (const side of ['left', 'right'] as const) {
      const arm = NYX_2D_UPPER_BODY_CALIBRATION[side];
      for (const point of [arm.shoulder, arm.elbow]) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(NYX_2D_MASTER.width);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(NYX_2D_MASTER.height);
      }
      expect(arm.elbow.y).toBeGreaterThan(arm.shoulder.y);
      expect(arm.influenceRadiusPx).toBeGreaterThan(arm.featherPx);
    }
  });

  it('keeps source lock metadata tied to the approved reference dimensions', () => {
    expect(NYX_2D_UPPER_BODY_CALIBRATION.referenceLock.orthographic).toMatchObject({
      width: 1448,
      height: 1086,
    });
    expect(NYX_2D_UPPER_BODY_CALIBRATION.referenceLock.detailSheet).toMatchObject({
      width: 1536,
      height: 1024,
    });
  });

  it('hard-clamps phase-2 motion to conservative source-safe limits', () => {
    expect(clampNyx2DShoulderDeg(100)).toBe(7);
    expect(clampNyx2DShoulderDeg(-100)).toBe(-7);
    expect(clampNyx2DTorsoYaw(1)).toBe(0.16);
    expect(clampNyx2DTorsoYaw(-1)).toBe(-0.16);
    expect(clampNyx2DTorsoShiftX(1)).toBe(0.003);
    expect(clampNyx2DTorsoLeanDeg(10)).toBe(0.6);
  });
});
