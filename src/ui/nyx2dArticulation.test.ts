import { afterEach, describe, expect, it } from 'vitest';
import {
  interpolateNyx2DArticulation,
  nyx2DArticulationIsNeutral,
  nyx2DArticulationTarget,
  nyx2DArticulationTransitionMs,
} from './nyx2dArticulation';
import { resetNyx2DRuntimeTuning, setNyx2DRuntimeTuning } from './nyx2dTuning';

afterEach(() => resetNyx2DRuntimeTuning());

describe('NYX forearm-only 2.5D poses', () => {
  it('keeps idle and offline neutral', () => {
    expect(nyx2DArticulationIsNeutral(nyx2DArticulationTarget('idle'))).toBe(true);
    expect(nyx2DArticulationIsNeutral(nyx2DArticulationTarget('offline'))).toBe(true);
  });

  it('gives every live semantic state a visible forearm silhouette', () => {
    for (const state of ['observing', 'processing', 'warning', 'success'] as const) {
      expect(nyx2DArticulationTarget(state).mix).toBe(1);
      expect(nyx2DArticulationIsNeutral(nyx2DArticulationTarget(state))).toBe(false);
    }
  });

  it('never rotates shoulders or synthesizes torso motion', () => {
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success', 'offline'] as const) {
      const pose = nyx2DArticulationTarget(state);
      expect(pose.left.shoulderDeg).toBe(0);
      expect(pose.right.shoulderDeg).toBe(0);
      expect(pose.torsoYaw).toBe(0);
      expect(pose.torsoShiftX).toBe(0);
      expect(pose.torsoLeanDeg).toBe(0);
    }
  });

  it('uses a one-forearm processing pose without extreme servo angles', () => {
    const pose = nyx2DArticulationTarget('processing');
    expect(pose.right.elbowDeg).toBe(-112);
    expect(pose.left).toEqual({ shoulderDeg: 0, elbowDeg: 0 });
  });

  it('uses both forearms for warning', () => {
    const pose = nyx2DArticulationTarget('warning');
    expect(pose.left.elbowDeg).toBe(92);
    expect(pose.right.elbowDeg).toBe(-92);
  });

  it('uses the opposite single forearm for success acknowledgement', () => {
    const pose = nyx2DArticulationTarget('success');
    expect(pose.left.elbowDeg).toBe(102);
    expect(pose.right).toEqual({ shoulderDeg: 0, elbowDeg: 0 });
  });

  it('applies live forearm calibration while torso stays retired', () => {
    const target = nyx2DArticulationTarget('processing');
    setNyx2DRuntimeTuning({ arms: 0.5, torso: 1.5 });
    const retuned = nyx2DArticulationTarget('processing');
    expect(retuned).toBe(target);
    expect(retuned.right.elbowDeg).toBe(-56);
    expect(retuned.torsoYaw).toBe(0);
  });

  it('uses a slow settle curve without overshooting target angles', () => {
    const idle = nyx2DArticulationTarget('idle');
    const processing = nyx2DArticulationTarget('processing');
    const half = interpolateNyx2DArticulation(idle, processing, 0.5);
    const late = interpolateNyx2DArticulation(idle, processing, 0.9);
    expect(half.mix).toBeGreaterThan(0);
    expect(half.mix).toBeLessThan(late.mix);
    expect(late.mix).toBeLessThan(1);
    expect(Math.abs(half.right.elbowDeg)).toBeLessThan(Math.abs(late.right.elbowDeg));
    expect(Math.abs(late.right.elbowDeg)).toBeLessThan(Math.abs(processing.right.elbowDeg));
  });

  it('keeps semantic transitions deliberately slower than the rejected servo motion', () => {
    expect(nyx2DArticulationTransitionMs('warning')).toBeGreaterThanOrEqual(1000);
    expect(nyx2DArticulationTransitionMs('processing')).toBeGreaterThanOrEqual(1300);
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success', 'offline'] as const) {
      expect(nyx2DArticulationTransitionMs(state)).toBeLessThanOrEqual(1400);
    }
  });
});
