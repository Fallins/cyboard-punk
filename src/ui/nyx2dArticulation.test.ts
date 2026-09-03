import { afterEach, describe, expect, it } from 'vitest';
import { resetNyx2DRuntimeAttentionTarget } from './nyx2dAttention';
import {
  coordinateNyx2DArticulation,
  interpolateNyx2DArticulation,
  nyx2DArticulationIsNeutral,
  nyx2DArticulationTarget,
  nyx2DArticulationTransitionMs,
} from './nyx2dArticulation';
import { resetNyx2DRuntimeTuning, setNyx2DRuntimeTuning } from './nyx2dTuning';
import { NYX_2D_UPPER_BODY_CALIBRATION } from './nyx2dUpperBodyCalibration';

afterEach(() => {
  resetNyx2DRuntimeTuning();
  resetNyx2DRuntimeAttentionTarget();
});

describe('NYX articulated 2.5D poses', () => {
  it('keeps idle and offline neutral', () => {
    expect(nyx2DArticulationIsNeutral(nyx2DArticulationTarget('idle', 'center'))).toBe(true);
    expect(nyx2DArticulationIsNeutral(nyx2DArticulationTarget('offline', 'center'))).toBe(true);
  });

  it('gives every live semantic state a visible articulated silhouette', () => {
    for (const state of ['observing', 'processing', 'warning', 'success'] as const) {
      expect(nyx2DArticulationTarget(state, 'center').mix).toBeGreaterThan(0);
      expect(nyx2DArticulationIsNeutral(nyx2DArticulationTarget(state, 'center'))).toBe(false);
    }
  });

  it('keeps shoulder and torso motion inside the source-guided calibration envelope', () => {
    const limits = NYX_2D_UPPER_BODY_CALIBRATION.limits;
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success', 'offline'] as const) {
      for (const target of ['center', 'codex', 'claude', 'cursor'] as const) {
        const pose = nyx2DArticulationTarget(state, target);
        expect(Math.abs(pose.left.shoulderDeg)).toBeLessThanOrEqual(limits.shoulderDeg);
        expect(Math.abs(pose.right.shoulderDeg)).toBeLessThanOrEqual(limits.shoulderDeg);
        expect(Math.abs(pose.torsoYaw)).toBeLessThanOrEqual(limits.torsoYaw);
        expect(Math.abs(pose.torsoShiftX)).toBeLessThanOrEqual(limits.torsoShiftX);
        expect(Math.abs(pose.torsoLeanDeg)).toBeLessThanOrEqual(limits.torsoLeanDeg);
      }
    }
  });

  it('keeps observing lighter than processing on the same center-facing arm chain', () => {
    const observing = nyx2DArticulationTarget('observing', 'center');
    const processing = nyx2DArticulationTarget('processing', 'center');
    expect(observing.right.elbowDeg).toBe(-56);
    expect(processing.right.elbowDeg).toBe(-98);
    expect(Math.abs(processing.right.elbowDeg)).toBeGreaterThan(Math.abs(observing.right.elbowDeg));
    expect(processing.right.shoulderDeg).toBeGreaterThan(observing.right.shoulderDeg);
    expect(observing.left.elbowDeg).toBe(0);
    expect(processing.left.elbowDeg).toBe(0);
  });

  it('switches the semantic operation hand to the provider side', () => {
    const codex = nyx2DArticulationTarget('processing', 'codex');
    expect(codex.left.elbowDeg).toBe(98);
    expect(codex.right.elbowDeg).toBe(0);
    expect(codex.left.shoulderDeg).toBeLessThan(0);
    expect(codex.torsoYaw).toBeLessThan(0);
    expect(codex.torsoShiftX).toBeLessThan(0);

    const claude = nyx2DArticulationTarget('processing', 'claude');
    expect(claude.left.elbowDeg).toBe(98);
    expect(claude.right.elbowDeg).toBe(0);
    expect(claude.torsoYaw).toBeLessThan(0);

    const cursor = nyx2DArticulationTarget('processing', 'cursor');
    expect(cursor.left.elbowDeg).toBe(0);
    expect(cursor.right.elbowDeg).toBe(-98);
    expect(cursor.right.shoulderDeg).toBeGreaterThan(0);
    expect(cursor.torsoYaw).toBeGreaterThan(0);
    expect(cursor.torsoShiftX).toBeGreaterThan(0);
  });

  it('keeps warning bilateral while emphasizing the provider side', () => {
    const codex = coordinateNyx2DArticulation('warning', 'codex');
    expect(codex.left.elbowDeg).toBeGreaterThan(0);
    expect(codex.right.elbowDeg).toBeLessThan(0);
    expect(Math.abs(codex.left.elbowDeg)).toBeGreaterThan(Math.abs(codex.right.elbowDeg));
    expect(codex.torsoYaw).toBeLessThan(0);

    const cursor = coordinateNyx2DArticulation('warning', 'cursor');
    expect(cursor.left.elbowDeg).toBeGreaterThan(0);
    expect(cursor.right.elbowDeg).toBeLessThan(0);
    expect(Math.abs(cursor.right.elbowDeg)).toBeGreaterThan(Math.abs(cursor.left.elbowDeg));
    expect(cursor.torsoYaw).toBeGreaterThan(0);
  });

  it('mirrors the success acknowledgement toward a right-side provider', () => {
    const center = nyx2DArticulationTarget('success', 'center');
    expect(center.left.elbowDeg).toBe(68);
    expect(center.right.elbowDeg).toBe(0);

    const cursor = nyx2DArticulationTarget('success', 'cursor');
    expect(cursor.left.elbowDeg).toBe(0);
    expect(cursor.right.elbowDeg).toBe(-68);
    expect(cursor.torsoYaw).toBeGreaterThan(0);
  });

  it('uses state-specific torso intent instead of one generic body shift', () => {
    const observing = nyx2DArticulationTarget('observing', 'center');
    const processing = nyx2DArticulationTarget('processing', 'center');
    const warning = nyx2DArticulationTarget('warning', 'center');
    const success = nyx2DArticulationTarget('success', 'center');

    expect(processing.torsoShiftX).toBeGreaterThan(observing.torsoShiftX);
    expect(processing.torsoYaw).toBeGreaterThan(observing.torsoYaw);
    expect(processing.torsoLeanDeg).toBeGreaterThan(observing.torsoLeanDeg);
    expect(warning.torsoShiftX).toBe(0);
    expect(warning.torsoLeanDeg).toBeLessThan(0);
    expect(success.torsoShiftX).toBeLessThan(0);
    expect(success.torsoYaw).toBeLessThan(0);
  });

  it('uses an asymmetric two-arm warning brace at center', () => {
    const pose = nyx2DArticulationTarget('warning', 'center');
    expect(pose.left.elbowDeg).toBe(76);
    expect(pose.right.elbowDeg).toBe(-84);
    expect(pose.left.shoulderDeg).toBeLessThan(0);
    expect(pose.right.shoulderDeg).toBeGreaterThan(0);
  });

  it('uses the opposite arm for a compact center success acknowledgement', () => {
    const pose = nyx2DArticulationTarget('success', 'center');
    expect(pose.left.elbowDeg).toBe(68);
    expect(pose.left.shoulderDeg).toBeLessThan(0);
    expect(pose.right.elbowDeg).toBe(0);
    expect(Math.abs(pose.left.elbowDeg)).toBeLessThan(
      Math.abs(nyx2DArticulationTarget('warning', 'center').left.elbowDeg),
    );
  });

  it('lets forearm and upper-body calibration scale independently', () => {
    const target = nyx2DArticulationTarget('processing', 'center');
    setNyx2DRuntimeTuning({ arms: 0.5, torso: 0 });
    const forearmOnly = nyx2DArticulationTarget('processing', 'center');
    expect(forearmOnly).toBe(target);
    expect(forearmOnly.right.elbowDeg).toBe(-49);
    expect(forearmOnly.right.shoulderDeg).toBe(0);
    expect(forearmOnly.torsoYaw).toBe(0);

    setNyx2DRuntimeTuning({ arms: 0, torso: 1 });
    const upperOnly = nyx2DArticulationTarget('processing', 'center');
    expect(Math.abs(upperOnly.right.elbowDeg)).toBe(0);
    expect(upperOnly.right.shoulderDeg).toBeGreaterThan(0);
    expect(upperOnly.torsoYaw).toBeGreaterThan(0);
  });

  it('lets the trunk lead the arm chain slightly during a semantic transition', () => {
    const idle = nyx2DArticulationTarget('idle', 'center');
    const processing = nyx2DArticulationTarget('processing', 'center');
    const halfway = interpolateNyx2DArticulation(idle, processing, 0.5);
    const torsoProgress = halfway.torsoShiftX / processing.torsoShiftX;
    const armProgress = Math.abs(halfway.right.elbowDeg / processing.right.elbowDeg);

    expect(torsoProgress).toBeGreaterThan(armProgress);
    expect(torsoProgress).toBeLessThan(1);
  });

  it('uses one continuous settle curve without overshooting target angles', () => {
    const idle = nyx2DArticulationTarget('idle', 'center');
    const processing = nyx2DArticulationTarget('processing', 'center');
    const half = interpolateNyx2DArticulation(idle, processing, 0.5);
    const late = interpolateNyx2DArticulation(idle, processing, 0.9);
    expect(half.mix).toBeGreaterThan(0);
    expect(half.mix).toBeLessThan(late.mix);
    expect(late.mix).toBeLessThanOrEqual(1);
    expect(Math.abs(half.right.elbowDeg)).toBeLessThan(Math.abs(late.right.elbowDeg));
    expect(Math.abs(late.right.elbowDeg)).toBeLessThan(Math.abs(processing.right.elbowDeg));
    expect(Math.abs(half.right.shoulderDeg)).toBeLessThan(Math.abs(late.right.shoulderDeg));
  });

  it('does not stop and restart near the old 80 percent settle boundary', () => {
    const idle = nyx2DArticulationTarget('idle', 'center');
    const processing = nyx2DArticulationTarget('processing', 'center');
    const before = interpolateNyx2DArticulation(idle, processing, 0.78).right.elbowDeg;
    const boundary = interpolateNyx2DArticulation(idle, processing, 0.80).right.elbowDeg;
    const after = interpolateNyx2DArticulation(idle, processing, 0.82).right.elbowDeg;
    expect(Math.abs(boundary - before)).toBeGreaterThan(0.15);
    expect(Math.abs(after - boundary)).toBeGreaterThan(0.15);
  });

  it('scales transition duration with actual articulated travel', () => {
    const idle = nyx2DArticulationTarget('idle', 'center');
    const observing = nyx2DArticulationTarget('observing', 'center');
    const processing = nyx2DArticulationTarget('processing', 'center');
    const warning = nyx2DArticulationTarget('warning', 'center');

    const idleToObserve = nyx2DArticulationTransitionMs('observing', idle, observing);
    const observeToProcess = nyx2DArticulationTransitionMs('processing', observing, processing);
    const warningToProcess = nyx2DArticulationTransitionMs('processing', warning, processing);

    expect(idleToObserve).toBeGreaterThanOrEqual(760);
    expect(observeToProcess).toBeGreaterThanOrEqual(820);
    expect(warningToProcess).toBeGreaterThan(observeToProcess);
    expect(warningToProcess).toBeLessThanOrEqual(1220);
  });
});
