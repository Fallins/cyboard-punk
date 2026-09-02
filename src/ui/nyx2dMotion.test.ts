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

  it('keeps processing life readable while lateral travel stays near one-pixel scale', () => {
    const horizontalPeak = nyx2DHeadPoseAtTime('processing', 1923);
    const downwardPeak = nyx2DHeadPoseAtTime('processing', 4412);
    const rotationPeak = nyx2DHeadPoseAtTime('processing', 2174);

    // Horizontal translation is no longer the life signal. It should remain tiny
    // while vertical posture + neck-pivot rotation remain readable.
    expect(Math.abs(horizontalPeak.x)).toBeGreaterThan(0.0022);
    expect(Math.abs(horizontalPeak.x)).toBeLessThan(0.0027);
    expect(Math.abs(downwardPeak.y)).toBeGreaterThan(0.0045);
    expect(Math.abs(rotationPeak.rotationRad)).toBeGreaterThan((1.4 * Math.PI) / 180);
    expect(Math.abs(rotationPeak.rotationRad)).toBeLessThan((1.8 * Math.PI) / 180);
  });

  it('adds state-specific posture without snapping on entry', () => {
    const processingEarly = nyx2DHeadPoseAtTime('processing', 100);
    const processingSettled = nyx2DHeadPoseAtTime('processing', 800);
    const successAck = nyx2DHeadPoseAtTime('success', 575);

    expect(Math.abs(processingEarly.y)).toBeLessThan(Math.abs(processingSettled.y));
    expect(successAck.y).toBeLessThan(-0.001);
  });

  it('stays frozen offline', () => {
    expect(nyx2DHeadPoseAtTime('offline', 100000)).toEqual({ x: 0, y: 0, rotationRad: 0 });
  });

  it('never exceeds the declared v1 envelope', () => {
    const envelope = NYX_2D_MOTION_ENVELOPES.head;
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success'] as const) {
      for (const time of [0, 100, 500, 1471, 1923, 2174, 4412, 5000, 17000, 43000]) {
        const pose = nyx2DHeadPoseAtTime(state, time);
        expect(Math.abs(pose.x)).toBeLessThanOrEqual(envelope.translateX + 1e-8);
        expect(Math.abs(pose.y)).toBeLessThanOrEqual(envelope.translateY + 1e-8);
        expect(Math.abs(pose.rotationRad)).toBeLessThanOrEqual((envelope.rotationDeg * Math.PI) / 180 + 1e-8);
      }
    }
  });
});
