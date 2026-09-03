import { afterEach, describe, expect, it } from 'vitest';
import {
  nyx2DHeadAttentionBias,
  resetNyx2DRuntimeAttentionTarget,
  type Nyx2DAttentionTarget,
} from './nyx2dAttention';
import {
  nyx2DArticulationIsNeutral,
  nyx2DArticulationTarget,
} from './nyx2dArticulation';
import { resetNyx2DRuntimeTuning } from './nyx2dTuning';
import { NYX_2D_UPPER_BODY_CALIBRATION } from './nyx2dUpperBodyCalibration';
import type { OperatorRuntimeState } from './operatorRuntime';

const states: readonly OperatorRuntimeState[] = [
  'idle',
  'observing',
  'processing',
  'warning',
  'success',
  'offline',
];
const targets: readonly Nyx2DAttentionTarget[] = ['center', 'codex', 'claude', 'cursor'];

function valuesFor(state: OperatorRuntimeState, target: Nyx2DAttentionTarget): number[] {
  const pose = nyx2DArticulationTarget(state, target);
  const head = nyx2DHeadAttentionBias(state, target);
  return [
    pose.left.shoulderDeg,
    pose.left.elbowDeg,
    pose.right.shoulderDeg,
    pose.right.elbowDeg,
    pose.torsoYaw,
    pose.torsoShiftX,
    pose.torsoLeanDeg,
    pose.mix,
    head.x,
    head.y,
    head.rotationDeg,
  ];
}

afterEach(() => {
  resetNyx2DRuntimeTuning();
  resetNyx2DRuntimeAttentionTarget();
});

describe('NYX state × provider motion regression matrix', () => {
  it('keeps every matrix entry finite and inside the source-guided upper-body envelope', () => {
    const limits = NYX_2D_UPPER_BODY_CALIBRATION.limits;
    for (const state of states) {
      for (const target of targets) {
        const pose = nyx2DArticulationTarget(state, target);
        expect(valuesFor(state, target).every(Number.isFinite)).toBe(true);
        expect(Math.abs(pose.left.shoulderDeg)).toBeLessThanOrEqual(limits.shoulderDeg);
        expect(Math.abs(pose.right.shoulderDeg)).toBeLessThanOrEqual(limits.shoulderDeg);
        expect(Math.abs(pose.torsoYaw)).toBeLessThanOrEqual(limits.torsoYaw);
        expect(Math.abs(pose.torsoShiftX)).toBeLessThanOrEqual(limits.torsoShiftX);
        expect(Math.abs(pose.torsoLeanDeg)).toBeLessThanOrEqual(limits.torsoLeanDeg);
      }
    }
  });

  it('keeps idle and offline neutral regardless of provider attention', () => {
    for (const state of ['idle', 'offline'] as const) {
      for (const target of targets) {
        expect(nyx2DArticulationIsNeutral(nyx2DArticulationTarget(state, target))).toBe(true);
      }
    }
  });

  it('keeps OBSERVE and PROCESS on the provider-side operation hand', () => {
    for (const state of ['observing', 'processing'] as const) {
      for (const target of ['codex', 'claude'] as const) {
        const pose = nyx2DArticulationTarget(state, target);
        expect(pose.left.elbowDeg).toBeGreaterThan(0);
        expect(pose.right.elbowDeg).toBe(0);
        expect(pose.torsoShiftX).toBeLessThan(0);
        expect(nyx2DHeadAttentionBias(state, target).x).toBeLessThan(0);
      }

      const cursor = nyx2DArticulationTarget(state, 'cursor');
      expect(cursor.left.elbowDeg).toBe(0);
      expect(cursor.right.elbowDeg).toBeLessThan(0);
      expect(cursor.torsoShiftX).toBeGreaterThan(0);
      expect(nyx2DHeadAttentionBias(state, 'cursor').x).toBeGreaterThan(0);
    }
  });

  it('keeps WARNING bilateral while biasing the provider side instead of dropping an arm', () => {
    for (const target of targets) {
      const pose = nyx2DArticulationTarget('warning', target);
      expect(pose.left.elbowDeg).toBeGreaterThan(0);
      expect(pose.right.elbowDeg).toBeLessThan(0);
    }

    const left = nyx2DArticulationTarget('warning', 'codex');
    const right = nyx2DArticulationTarget('warning', 'cursor');
    expect(Math.abs(left.left.elbowDeg)).toBeGreaterThan(Math.abs(left.right.elbowDeg));
    expect(Math.abs(right.right.elbowDeg)).toBeGreaterThan(Math.abs(right.left.elbowDeg));
  });

  it('keeps SUCCESS compact and mirrors it only when attention moves to the right side', () => {
    for (const target of ['center', 'codex', 'claude'] as const) {
      const pose = nyx2DArticulationTarget('success', target);
      expect(pose.left.elbowDeg).toBeGreaterThan(0);
      expect(pose.right.elbowDeg).toBe(0);
    }

    const cursor = nyx2DArticulationTarget('success', 'cursor');
    expect(cursor.left.elbowDeg).toBe(0);
    expect(cursor.right.elbowDeg).toBeLessThan(0);
  });
});
