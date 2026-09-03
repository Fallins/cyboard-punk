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

  it('keeps observing visibly lighter than processing on the same forearm', () => {
    const observing = nyx2DArticulationTarget('observing');
    const processing = nyx2DArticulationTarget('processing');
    expect(observing.right.elbowDeg).toBe(-56);
    expect(processing.right.elbowDeg).toBe(-98);
    expect(Math.abs(processing.right.elbowDeg)).toBeGreaterThan(Math.abs(observing.right.elbowDeg));
    expect(observing.left).toEqual({ shoulderDeg: 0, elbowDeg: 0 });
    expect(processing.left).toEqual({ shoulderDeg: 0, elbowDeg: 0 });
  });

  it('uses an asymmetric two-forearm warning brace', () => {
    const pose = nyx2DArticulationTarget('warning');
    expect(pose.left.elbowDeg).toBe(76);
    expect(pose.right.elbowDeg).toBe(-84);
    expect(Math.abs(pose.left.elbowDeg)).not.toBe(Math.abs(pose.right.elbowDeg));
  });

  it('uses the opposite forearm for a compact success acknowledgement', () => {
    const pose = nyx2DArticulationTarget('success');
    expect(pose.left.elbowDeg).toBe(68);
    expect(pose.right).toEqual({ shoulderDeg: 0, elbowDeg: 0 });
    expect(Math.abs(pose.left.elbowDeg)).toBeLessThan(Math.abs(nyx2DArticulationTarget('warning').left.elbowDeg));
  });

  it('applies live forearm calibration while torso stays retired', () => {
    const target = nyx2DArticulationTarget('processing');
    setNyx2DRuntimeTuning({ arms: 0.5, torso: 1.5 });
    const retuned = nyx2DArticulationTarget('processing');
    expect(retuned).toBe(target);
    expect(retuned.right.elbowDeg).toBe(-49);
    expect(retuned.torsoYaw).toBe(0);
  });

  it('uses one continuous settle curve without overshooting target angles', () => {
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

  it('does not stop and restart near the old 80 percent settle boundary', () => {
    const idle = nyx2DArticulationTarget('idle');
    const processing = nyx2DArticulationTarget('processing');
    const before = interpolateNyx2DArticulation(idle, processing, 0.78).right.elbowDeg;
    const boundary = interpolateNyx2DArticulation(idle, processing, 0.80).right.elbowDeg;
    const after = interpolateNyx2DArticulation(idle, processing, 0.82).right.elbowDeg;
    expect(Math.abs(boundary - before)).toBeGreaterThan(0.15);
    expect(Math.abs(after - boundary)).toBeGreaterThan(0.15);
  });

  it('scales transition duration with actual angular travel', () => {
    const idle = nyx2DArticulationTarget('idle');
    const observing = nyx2DArticulationTarget('observing');
    const processing = nyx2DArticulationTarget('processing');
    const warning = nyx2DArticulationTarget('warning');

    const idleToObserve = nyx2DArticulationTransitionMs('observing', idle, observing);
    const observeToProcess = nyx2DArticulationTransitionMs('processing', observing, processing);
    const warningToProcess = nyx2DArticulationTransitionMs('processing', warning, processing);

    expect(idleToObserve).toBeGreaterThanOrEqual(760);
    expect(observeToProcess).toBeGreaterThanOrEqual(880);
    expect(warningToProcess).toBeGreaterThan(observeToProcess);
    expect(warningToProcess).toBeLessThanOrEqual(1220);
  });

  it('keeps every semantic transition inside the human-readable timing window', () => {
    const idle = nyx2DArticulationTarget('idle');
    for (const state of ['observing', 'processing', 'warning', 'success'] as const) {
      const duration = nyx2DArticulationTransitionMs(state, idle, nyx2DArticulationTarget(state));
      expect(duration).toBeGreaterThanOrEqual(760);
      expect(duration).toBeLessThanOrEqual(1220);
    }
  });
});
