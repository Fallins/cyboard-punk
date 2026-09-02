import { afterEach, describe, expect, it } from 'vitest';
import {
  interpolateNyx2DArticulation,
  nyx2DArticulationIsNeutral,
  nyx2DArticulationTarget,
  nyx2DArticulationTransitionMs,
} from './nyx2dArticulation';
import { resetNyx2DRuntimeTuning, setNyx2DRuntimeTuning } from './nyx2dTuning';

afterEach(() => resetNyx2DRuntimeTuning());

describe('NYX articulated 2.5D poses', () => {
  it('keeps idle and offline neutral', () => {
    expect(nyx2DArticulationIsNeutral(nyx2DArticulationTarget('idle'))).toBe(true);
    expect(nyx2DArticulationIsNeutral(nyx2DArticulationTarget('offline'))).toBe(true);
  });

  it('gives every live semantic state a genuinely articulated silhouette', () => {
    for (const state of ['observing', 'processing', 'warning', 'success'] as const) {
      expect(nyx2DArticulationTarget(state).mix).toBe(1);
      expect(nyx2DArticulationIsNeutral(nyx2DArticulationTarget(state))).toBe(false);
    }
  });

  it('uses a one-arm processing pose with a chest-reaching elbow fold', () => {
    const pose = nyx2DArticulationTarget('processing');
    expect(Math.abs(pose.right.shoulderDeg)).toBeGreaterThanOrEqual(25);
    expect(Math.abs(pose.right.elbowDeg)).toBeGreaterThanOrEqual(160);
    expect(pose.left).toEqual({ shoulderDeg: 0, elbowDeg: 0 });
  });

  it('uses both arms for warning instead of translating the whole sprite', () => {
    const pose = nyx2DArticulationTarget('warning');
    expect(Math.abs(pose.left.shoulderDeg)).toBeGreaterThanOrEqual(30);
    expect(Math.abs(pose.right.shoulderDeg)).toBeGreaterThanOrEqual(30);
    expect(Math.abs(pose.left.elbowDeg)).toBeGreaterThanOrEqual(150);
    expect(Math.abs(pose.right.elbowDeg)).toBeGreaterThanOrEqual(150);
  });

  it('uses the opposite single arm for success acknowledgement', () => {
    const pose = nyx2DArticulationTarget('success');
    expect(Math.abs(pose.left.elbowDeg)).toBeGreaterThanOrEqual(160);
    expect(pose.right).toEqual({ shoulderDeg: 0, elbowDeg: 0 });
  });

  it('applies live arm and torso calibration without changing the authored state', () => {
    const target = nyx2DArticulationTarget('processing');
    expect(target.right.elbowDeg).toBe(-170);
    setNyx2DRuntimeTuning({ arms: 0.5, torso: 0.5 });
    const retuned = nyx2DArticulationTarget('processing');
    expect(retuned).toBe(target);
    expect(retuned.right.elbowDeg).toBe(-85);
    expect(retuned.torsoYaw).toBeCloseTo(-0.16);
  });

  it('interpolates smoothly without overshooting target joint angles', () => {
    const idle = nyx2DArticulationTarget('idle');
    const processing = nyx2DArticulationTarget('processing');
    const half = interpolateNyx2DArticulation(idle, processing, 0.5);
    expect(half.mix).toBeGreaterThan(0);
    expect(half.mix).toBeLessThan(1);
    expect(Math.abs(half.right.shoulderDeg)).toBeLessThan(Math.abs(processing.right.shoulderDeg));
    expect(Math.abs(half.right.elbowDeg)).toBeLessThan(Math.abs(processing.right.elbowDeg));
  });

  it('keeps transitions short enough to read as responsive UI state', () => {
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success', 'offline'] as const) {
      expect(nyx2DArticulationTransitionMs(state)).toBeGreaterThanOrEqual(400);
      expect(nyx2DArticulationTransitionMs(state)).toBeLessThanOrEqual(700);
    }
  });
});
