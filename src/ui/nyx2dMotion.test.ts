import { describe, expect, it } from 'vitest';
import { nyx2DHeadMotionEnabled, nyx2DHeadPoseAtTime } from './nyx2dMotion';
import { NYX_2D_MOTION_ENVELOPES } from './nyx2dRig';

describe('NYX 2D head micro-motion', () => {
  it('is opt-in only', () => {
    expect(nyx2DHeadMotionEnabled('1')).toBe(true);
    expect(nyx2DHeadMotionEnabled('true')).toBe(true);
    expect(nyx2DHeadMotionEnabled(undefined)).toBe(false);
    expect(nyx2DHeadMotionEnabled('0')).toBe(false);
  });

  it('stays frozen offline', () => {
    expect(nyx2DHeadPoseAtTime('offline', 100000)).toEqual({ x: 0, y: 0, rotationRad: 0 });
  });

  it('never exceeds the declared v1 envelope', () => {
    const envelope = NYX_2D_MOTION_ENVELOPES.head;
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success'] as const) {
      for (const time of [0, 500, 1500, 5000, 17000, 43000]) {
        const pose = nyx2DHeadPoseAtTime(state, time);
        expect(Math.abs(pose.x)).toBeLessThanOrEqual(envelope.translateX + 1e-8);
        expect(Math.abs(pose.y)).toBeLessThanOrEqual(envelope.translateY + 1e-8);
        expect(Math.abs(pose.rotationRad)).toBeLessThanOrEqual((envelope.rotationDeg * Math.PI) / 180 + 1e-8);
      }
    }
  });
});
