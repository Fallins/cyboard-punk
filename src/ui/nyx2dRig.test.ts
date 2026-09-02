import { describe, expect, it } from 'vitest';
import {
  NYX_2D_MASTER,
  NYX_2D_MOTION_ENVELOPES,
  NYX_2D_PARTITION,
  NYX_2D_RIG_ZONES,
  pointInNyx2DRect,
  validateNyx2DRigZones,
} from './nyx2dRig';

describe('NYX 2D rig contract', () => {
  it('matches the approved master raster and measured alpha bounds', () => {
    expect(NYX_2D_MASTER.width).toBe(941);
    expect(NYX_2D_MASTER.height).toBe(1672);
    expect(NYX_2D_MASTER.alphaBoundsPx).toEqual({
      left: 219,
      top: 38,
      right: 723,
      bottom: 1637,
    });
  });

  it('keeps all calibration zones valid and the protected face inside the head', () => {
    expect(validateNyx2DRigZones()).toEqual([]);
    const face = NYX_2D_RIG_ZONES.protectedFace;
    const head = NYX_2D_RIG_ZONES.head;
    expect(pointInNyx2DRect(face.left, face.bottom, head)).toBe(true);
    expect(pointInNyx2DRect(face.right, face.top, head)).toBe(true);
  });

  it('locks the first anatomy partition at the collar/shoulder transition', () => {
    expect(NYX_2D_PARTITION.headCutYPx).toBe(300);
    expect(NYX_2D_PARTITION.headCutUvY).toBeCloseTo(1 - 300 / 1672, 8);
  });

  it('keeps life motion readable but bounded', () => {
    expect(NYX_2D_MOTION_ENVELOPES.head.translateX).toBeGreaterThanOrEqual(0.008);
    expect(NYX_2D_MOTION_ENVELOPES.head.translateX).toBeLessThanOrEqual(0.012);
    expect(NYX_2D_MOTION_ENVELOPES.head.rotationDeg).toBeGreaterThanOrEqual(1.6);
    expect(NYX_2D_MOTION_ENVELOPES.head.rotationDeg).toBeLessThanOrEqual(2.2);

    expect(NYX_2D_MOTION_ENVELOPES.torsoBreath.scaleY).toBeGreaterThanOrEqual(0.014);
    expect(NYX_2D_MOTION_ENVELOPES.torsoBreath.scaleY).toBeLessThanOrEqual(0.022);
    expect(NYX_2D_MOTION_ENVELOPES.torsoBreath.scaleX).toBeLessThanOrEqual(0.012);

    expect(NYX_2D_MOTION_ENVELOPES.hair.rotationDeg).toBeLessThanOrEqual(1.2);
  });
});
