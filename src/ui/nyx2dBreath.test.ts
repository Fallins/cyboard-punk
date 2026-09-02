import { describe, expect, it } from 'vitest';
import {
  nyx2DBreathEnabled,
  nyx2DBreathPoseAtTime,
  nyx2DShouldAnimateBreath,
} from './nyx2dBreath';
import { NYX_2D_MOTION_ENVELOPES } from './nyx2dRig';

describe('NYX 2D torso breathing', () => {
  it('is opt-in only', () => {
    expect(nyx2DBreathEnabled('1')).toBe(true);
    expect(nyx2DBreathEnabled('true')).toBe(true);
    expect(nyx2DBreathEnabled(undefined)).toBe(false);
    expect(nyx2DBreathEnabled('0')).toBe(false);
  });

  it('requires visibility, motion permission, and a non-offline state', () => {
    expect(nyx2DShouldAnimateBreath('idle', true, false, true)).toBe(true);
    expect(nyx2DShouldAnimateBreath('idle', false, false, true)).toBe(false);
    expect(nyx2DShouldAnimateBreath('idle', true, true, true)).toBe(false);
    expect(nyx2DShouldAnimateBreath('idle', true, false, false)).toBe(false);
    expect(nyx2DShouldAnimateBreath('offline', true, false, true)).toBe(false);
  });

  it('starts from exact neutral geometry', () => {
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success'] as const) {
      expect(nyx2DBreathPoseAtTime(state, 0)).toEqual({ translateY: 0, scaleX: 1, scaleY: 1 });
    }
  });

  it('keeps processing breath visually meaningful', () => {
    // Processing is 0.18 Hz and inhale occupies 38% of the cycle, so the first
    // full inhale lands around 2.11s.
    const pose = nyx2DBreathPoseAtTime('processing', 2111);
    expect(pose.translateY).toBeGreaterThan(0.005);
    expect(pose.scaleX - 1).toBeGreaterThan(0.006);
    expect(pose.scaleY - 1).toBeGreaterThan(0.012);
  });

  it('never compresses below the approved neutral silhouette', () => {
    for (let time = 0; time <= 20000; time += 113) {
      const pose = nyx2DBreathPoseAtTime('idle', time);
      expect(pose.translateY).toBeGreaterThanOrEqual(0);
      expect(pose.scaleX).toBeGreaterThanOrEqual(1);
      expect(pose.scaleY).toBeGreaterThanOrEqual(1);
    }
  });

  it('stays inside the declared torso envelope', () => {
    const envelope = NYX_2D_MOTION_ENVELOPES.torsoBreath;
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success'] as const) {
      for (const time of [0, 700, 2111, 3400, 7200, 15000]) {
        const pose = nyx2DBreathPoseAtTime(state, time);
        expect(Math.abs(pose.translateY)).toBeLessThanOrEqual(envelope.translateY + 1e-8);
        expect(Math.abs(pose.scaleX - 1)).toBeLessThanOrEqual(envelope.scaleX + 1e-8);
        expect(Math.abs(pose.scaleY - 1)).toBeLessThanOrEqual(envelope.scaleY + 1e-8);
      }
    }
  });
});
