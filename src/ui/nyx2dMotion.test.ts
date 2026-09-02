import { describe, expect, it } from 'vitest';
import {
  nyx2DHeadMotionEnabled,
  nyx2DHeadPoseAtTime,
  nyx2DShouldAnimateHead,
} from './nyx2dMotion';
import { NYX_2D_MOTION_ENVELOPES } from './nyx2dRig';

describe('NYX 2D head micro-motion', () => {
  it('is opt-in only', () => {
    expect(nyx2DHeadMotionEnabled('1')).toBe(true);
    expect(nyx2DHeadMotionEnabled('true')).toBe(true);
    expect(nyx2DHeadMotionEnabled(undefined)).toBe(false);
    expect(nyx2DHeadMotionEnabled('0')).toBe(false);
  });

  it('requires visibility, motion permission, and a non-offline state', () => {
    expect(nyx2DShouldAnimateHead('idle', true, false, true)).toBe(true);
    expect(nyx2DShouldAnimateHead('idle', false, false, true)).toBe(false);
    expect(nyx2DShouldAnimateHead('idle', true, true, true)).toBe(false);
    expect(nyx2DShouldAnimateHead('idle', true, false, false)).toBe(false);
    expect(nyx2DShouldAnimateHead('offline', true, false, true)).toBe(false);
  });

  it('starts every animated state from exact neutral pose', () => {
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success'] as const) {
      expect(nyx2DHeadPoseAtTime(state, 0)).toEqual({ x: 0, y: 0, rotationRad: 0 });
    }
  });

  it('keeps processing motion visibly above the previous sub-pixel regime', () => {
    const horizontalPeak = nyx2DHeadPoseAtTime('processing', 3521);
    const verticalPeak = nyx2DHeadPoseAtTime('processing', 4717);
    const rotationPeak = nyx2DHeadPoseAtTime('processing', 4098);

    expect(Math.abs(horizontalPeak.x)).toBeGreaterThan(0.01);
    expect(Math.abs(verticalPeak.y)).toBeGreaterThan(0.005);
    expect(Math.abs(rotationPeak.rotationRad)).toBeGreaterThan((1.6 * Math.PI) / 180);
  });

  it('stays frozen offline', () => {
    expect(nyx2DHeadPoseAtTime('offline', 100000)).toEqual({ x: 0, y: 0, rotationRad: 0 });
  });

  it('never exceeds the declared v1 envelope', () => {
    const envelope = NYX_2D_MOTION_ENVELOPES.head;
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success'] as const) {
      for (const time of [0, 500, 1500, 3521, 4717, 5000, 17000, 43000]) {
        const pose = nyx2DHeadPoseAtTime(state, time);
        expect(Math.abs(pose.x)).toBeLessThanOrEqual(envelope.translateX + 1e-8);
        expect(Math.abs(pose.y)).toBeLessThanOrEqual(envelope.translateY + 1e-8);
        expect(Math.abs(pose.rotationRad)).toBeLessThanOrEqual((envelope.rotationDeg * Math.PI) / 180 + 1e-8);
      }
    }
  });
});
