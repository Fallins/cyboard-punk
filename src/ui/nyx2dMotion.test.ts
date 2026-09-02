import { describe, expect, it } from 'vitest';
import { nyx2DBreathPoseAtTime } from './nyx2dBreath';
import {
  nyx2DHeadMotionEnabled,
  nyx2DHeadPoseAtTime,
  nyx2DShouldAnimateHead,
} from './nyx2dMotion';
import { NYX_2D_MOTION_ENVELOPES } from './nyx2dRig';

describe('NYX 2D anchored head posture', () => {
  it('is enabled by stable default but remains explicitly disableable', () => {
    expect(nyx2DHeadMotionEnabled(undefined)).toBe(true);
    expect(nyx2DHeadMotionEnabled('')).toBe(true);
    expect(nyx2DHeadMotionEnabled('1')).toBe(true);
    expect(nyx2DHeadMotionEnabled('true')).toBe(true);
    expect(nyx2DHeadMotionEnabled('0')).toBe(false);
    expect(nyx2DHeadMotionEnabled('false')).toBe(false);
    expect(nyx2DHeadMotionEnabled('off')).toBe(false);
    expect(nyx2DHeadMotionEnabled('no')).toBe(false);
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

  it('holds near neutral before making a posture adjustment', () => {
    const early = nyx2DHeadPoseAtTime('idle', 1200);
    const adjusted = nyx2DHeadPoseAtTime('idle', 3600);

    expect(Math.abs(early.x)).toBeLessThan(0.0002);
    expect(Math.abs(early.rotationRad)).toBeLessThan((0.08 * Math.PI) / 180);
    expect(Math.abs(adjusted.rotationRad)).toBeGreaterThan((0.5 * Math.PI) / 180);
  });

  it('keeps horizontal sliding tiny while rotation carries the visible adjustment', () => {
    const pose = nyx2DHeadPoseAtTime('processing', 3600);
    const envelope = NYX_2D_MOTION_ENVELOPES.head;

    expect(Math.abs(pose.x)).toBeLessThan(envelope.translateX * 0.16);
    expect(Math.abs(pose.rotationRad)).toBeGreaterThan((0.45 * Math.PI) / 180);
  });

  it('returns to a held neutral posture instead of oscillating forever', () => {
    const adjusted = nyx2DHeadPoseAtTime('idle', 3600);
    const settled = nyx2DHeadPoseAtTime('idle', 7000);

    expect(Math.abs(adjusted.rotationRad)).toBeGreaterThan((0.5 * Math.PI) / 180);
    expect(Math.abs(settled.rotationRad)).toBeLessThan((0.08 * Math.PI) / 180);
    expect(Math.abs(settled.x)).toBeLessThan(0.0002);
  });

  it('inherits the torso breathing phase vertically instead of running a separate Y oscillator', () => {
    const time = 1200;
    const head = nyx2DHeadPoseAtTime('idle', time);
    const breath = nyx2DBreathPoseAtTime('idle', time);

    expect(breath.translateY).toBeGreaterThan(0);
    expect(head.y).toBeGreaterThan(0);
  });

  it('does not hide state-entry acknowledgements inside the continuous head clock', () => {
    const successAtHalfSecond = nyx2DHeadPoseAtTime('success', 525);
    const idleAtHalfSecond = nyx2DHeadPoseAtTime('idle', 525);

    expect(successAtHalfSecond.rotationRad).toBeCloseTo(0, 10);
    expect(idleAtHalfSecond.rotationRad).toBeCloseTo(0, 10);
    expect(successAtHalfSecond.y).toBeGreaterThanOrEqual(0);
  });

  it('stays frozen offline', () => {
    expect(nyx2DHeadPoseAtTime('offline', 100000)).toEqual({ x: 0, y: 0, rotationRad: 0 });
  });

  it('never exceeds the declared v1 envelope', () => {
    const envelope = NYX_2D_MOTION_ENVELOPES.head;
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success'] as const) {
      for (const time of [0, 100, 900, 1200, 2500, 3600, 5000, 7000, 17000, 43000]) {
        const pose = nyx2DHeadPoseAtTime(state, time);
        expect(Math.abs(pose.x)).toBeLessThanOrEqual(envelope.translateX + 1e-8);
        expect(Math.abs(pose.y)).toBeLessThanOrEqual(envelope.translateY + 1e-8);
        expect(Math.abs(pose.rotationRad)).toBeLessThanOrEqual((envelope.rotationDeg * Math.PI) / 180 + 1e-8);
      }
    }
  });
});
