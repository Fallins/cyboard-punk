import { describe, expect, it } from 'vitest';
import {
  nyx2DBreathEnabled,
  nyx2DBreathPoseAtTime,
  nyx2DShouldAnimateBreath,
} from './nyx2dBreath';
import { NYX_2D_MOTION_ENVELOPES } from './nyx2dRig';
import { NYX_2D_PRODUCTION_TUNING } from './nyx2dTuning';

describe('NYX 2D torso breathing', () => {
  it('is enabled by stable default but remains explicitly disableable', () => {
    expect(nyx2DBreathEnabled(undefined)).toBe(true);
    expect(nyx2DBreathEnabled('')).toBe(true);
    expect(nyx2DBreathEnabled('1')).toBe(true);
    expect(nyx2DBreathEnabled('true')).toBe(true);
    expect(nyx2DBreathEnabled('0')).toBe(false);
    expect(nyx2DBreathEnabled('false')).toBe(false);
    expect(nyx2DBreathEnabled('off')).toBe(false);
    expect(nyx2DBreathEnabled('no')).toBe(false);
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
    const pose = nyx2DBreathPoseAtTime('processing', 2111);
    expect(pose.translateY).toBeGreaterThan(0.005);
    expect(pose.scaleX - 1).toBeGreaterThan(0.006);
    expect(pose.scaleY - 1).toBeGreaterThan(0.012);
  });

  it('uses a deliberately stronger 1.25x production breath', () => {
    expect(NYX_2D_PRODUCTION_TUNING.breath).toBe(1.25);
    const base = nyx2DBreathPoseAtTime('idle', 1800, 1);
    const production = nyx2DBreathPoseAtTime('idle', 1800, NYX_2D_PRODUCTION_TUNING.breath);
    expect(production.translateY).toBeGreaterThan(base.translateY);
    expect(production.scaleY - 1).toBeGreaterThan(base.scaleY - 1);
  });

  it('can be zeroed for direct A/B calibration', () => {
    expect(nyx2DBreathPoseAtTime('idle', 1800, 0)).toEqual({ translateY: 0, scaleX: 1, scaleY: 1 });
  });

  it('never compresses below the approved neutral silhouette', () => {
    for (let time = 0; time <= 20000; time += 113) {
      const pose = nyx2DBreathPoseAtTime('idle', time);
      expect(pose.translateY).toBeGreaterThanOrEqual(0);
      expect(pose.scaleX).toBeGreaterThanOrEqual(1);
      expect(pose.scaleY).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps the 1x calibration baseline inside the declared torso envelope', () => {
    const envelope = NYX_2D_MOTION_ENVELOPES.torsoBreath;
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success'] as const) {
      for (const time of [0, 700, 2111, 3400, 7200, 15000]) {
        const pose = nyx2DBreathPoseAtTime(state, time, 1);
        expect(Math.abs(pose.translateY)).toBeLessThanOrEqual(envelope.translateY + 1e-8);
        expect(Math.abs(pose.scaleX - 1)).toBeLessThanOrEqual(envelope.scaleX + 1e-8);
        expect(Math.abs(pose.scaleY - 1)).toBeLessThanOrEqual(envelope.scaleY + 1e-8);
      }
    }
  });
});
