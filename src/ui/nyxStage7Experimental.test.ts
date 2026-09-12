import { describe, expect, it } from 'vitest';
import { NYX_2D_STABLE_PERFORMANCE_BUDGET } from './nyx2dPerformance';
import {
  createNyxStage7MotionState,
  neutralNyxStage7MotionSample,
  NYX_STAGE7_MAX_LAYER_EQUIVALENT,
  resolveNyxStage7RuntimeTier,
  sampleNyxStage7Acknowledgement,
  sampleNyxStage7Blink,
  sampleNyxStage7Breathing,
  stepNyxStage7Motion,
} from './nyxStage7Experimental';

describe('NYX Stage 7 experimental runtime contract', () => {
  it('keeps production as the default and requires the exact stage7 opt-in', () => {
    expect(resolveNyxStage7RuntimeTier()).toBe('production');
    expect(resolveNyxStage7RuntimeTier('')).toBe('production');
    expect(resolveNyxStage7RuntimeTier('experimental')).toBe('production');
    expect(resolveNyxStage7RuntimeTier('stage7')).toBe('stage7-experimental');
    expect(resolveNyxStage7RuntimeTier(' STAGE7 ')).toBe('stage7-experimental');
  });

  it('discards hidden elapsed time while preserving the breathing phase', () => {
    const runtime = createNyxStage7MotionState(0, 'idle');
    stepNyxStage7Motion(runtime, {
      state: 'idle', attentionTarget: 'center', animate: true, forceNeutral: false,
    }, 16);
    const beforeHidden = runtime.elapsedMs;

    stepNyxStage7Motion(runtime, {
      state: 'idle', attentionTarget: 'center', animate: false, forceNeutral: false,
    }, 32);
    expect(runtime.elapsedMs).toBe(beforeHidden);

    stepNyxStage7Motion(runtime, {
      state: 'idle', attentionTarget: 'center', animate: true, forceNeutral: false,
    }, 10_016);
    expect(runtime.elapsedMs).toBe(beforeHidden);

    stepNyxStage7Motion(runtime, {
      state: 'idle', attentionTarget: 'center', animate: true, forceNeutral: false,
    }, 10_032);
    expect(runtime.elapsedMs).toBe(beforeHidden + 16);
  });

  it('uses a neutral static composition for reduced motion and offline state', () => {
    const runtime = createNyxStage7MotionState(0, 'processing');
    stepNyxStage7Motion(runtime, {
      state: 'processing', attentionTarget: 'cursor', animate: true, forceNeutral: false,
    }, 64);

    expect(stepNyxStage7Motion(runtime, {
      state: 'processing', attentionTarget: 'cursor', animate: false, forceNeutral: true,
    }, 80)).toEqual(neutralNyxStage7MotionSample());
    expect(stepNyxStage7Motion(runtime, {
      state: 'offline', attentionTarget: 'cursor', animate: false, forceNeutral: true,
    }, 96)).toEqual(neutralNyxStage7MotionSample());
  });

  it('retargets attention continuously without resetting the motion clock', () => {
    const runtime = createNyxStage7MotionState(0, 'observing');
    stepNyxStage7Motion(runtime, {
      state: 'observing', attentionTarget: 'cursor', animate: true, forceNeutral: false,
    }, 50);
    const elapsedBeforeRetarget = runtime.elapsedMs;
    const mixBeforeRetarget = runtime.headAttentionMix;
    expect(mixBeforeRetarget).toBeGreaterThan(0);

    stepNyxStage7Motion(runtime, {
      state: 'observing', attentionTarget: 'codex', animate: true, forceNeutral: false,
    }, 66);
    expect(runtime.elapsedMs).toBe(elapsedBeforeRetarget + 16);
    expect(runtime.headAttentionMix).toBeLessThan(mixBeforeRetarget);
    expect(runtime.headAttentionMix).toBeGreaterThan(-1);
  });

  it('uses visible local chest breathing with the 5 second cadence and stable lower body', () => {
    const exhale = sampleNyxStage7Breathing(0);
    const mid = sampleNyxStage7Breathing(1_000);
    const peak = sampleNyxStage7Breathing(2_200);
    const afterPeak = sampleNyxStage7Breathing(3_600);
    const rest = sampleNyxStage7Breathing(4_800);

    expect(exhale).toMatchObject({ amount: 0, chestRisePx: 0, chestScaleX: 1, chestScaleY: 1, shoulderRisePx: 0 });
    expect(mid.amount).toBeGreaterThan(0);
    expect(mid.amount).toBeLessThan(peak.amount);
    expect(peak.amount).toBe(1);
    expect(peak.chestRisePx).toBeGreaterThanOrEqual(0.8);
    expect(peak.chestRisePx).toBeLessThanOrEqual(1.5);
    expect(peak.chestScaleX).toBeGreaterThanOrEqual(1.002);
    expect(peak.chestScaleX).toBeLessThanOrEqual(1.006);
    expect(peak.chestScaleY).toBeGreaterThanOrEqual(1.003);
    expect(peak.chestScaleY).toBeLessThanOrEqual(1.008);
    expect(peak.shoulderRisePx).toBeGreaterThanOrEqual(0.3);
    expect(peak.shoulderRisePx).toBeLessThanOrEqual(0.8);
    expect(afterPeak.amount).toBeLessThan(peak.amount);
    expect(rest.amount).toBe(0);
    expect(sampleNyxStage7Breathing(5_000)).toEqual(exhale);
  });

  it('uses a restrained shoulder-led acknowledgement with tiny wrist follow and monotonic settle', () => {
    const start = sampleNyxStage7Acknowledgement(160);
    const mid = sampleNyxStage7Acknowledgement(320);
    const peak = sampleNyxStage7Acknowledgement(620);
    const late = sampleNyxStage7Acknowledgement(860);
    const settle = sampleNyxStage7Acknowledgement(1_120);
    const neutral = sampleNyxStage7Acknowledgement(1_400);

    expect(Math.abs(start.shoulderAngleDeg)).toBeGreaterThan(Math.abs(start.elbowAngleDeg));
    expect(Math.abs(start.elbowAngleDeg)).toBeGreaterThanOrEqual(Math.abs(start.wristAdditionalDeg));
    expect(Math.abs(mid.shoulderAngleDeg)).toBeGreaterThan(Math.abs(mid.elbowAngleDeg));
    expect(peak).toMatchObject({
      neckAngleDeg: 0.8,
      torsoAngleDeg: -0.35,
      shoulderAngleDeg: -8,
      elbowAngleDeg: -4.8,
      wristAdditionalDeg: -0.7,
      acknowledgementActive: true,
    });
    expect(Math.abs(peak.wristAdditionalDeg)).toBeLessThan(1);
    expect(Math.abs(late.shoulderAngleDeg)).toBeLessThan(Math.abs(peak.shoulderAngleDeg));
    expect(Math.abs(settle.shoulderAngleDeg)).toBeLessThan(Math.abs(late.shoulderAngleDeg));
    expect(Math.abs(late.elbowAngleDeg)).toBeLessThan(Math.abs(peak.elbowAngleDeg));
    expect(Math.abs(settle.elbowAngleDeg)).toBeLessThan(Math.abs(late.elbowAngleDeg));
    expect(Math.abs(late.wristAdditionalDeg)).toBeLessThan(Math.abs(peak.wristAdditionalDeg));
    expect(Math.abs(settle.wristAdditionalDeg)).toBeLessThan(Math.abs(late.wristAdditionalDeg));
    expect(neutral).toMatchObject({
      shoulderAngleDeg: 0,
      elbowAngleDeg: 0,
      wristAdditionalDeg: 0,
      acknowledgementActive: false,
    });
  });

  it('preserves the 310 ms blink cadence while allowing progressive aperture closure', () => {
    expect(sampleNyxStage7Blink(4_800)).toBe(0);
    expect(sampleNyxStage7Blink(4_847)).toBeGreaterThan(0);
    expect(sampleNyxStage7Blink(4_895)).toBe(1);
    expect(sampleNyxStage7Blink(4_950)).toBe(1);
    expect(sampleNyxStage7Blink(5_000)).toBeGreaterThan(0);
    expect(sampleNyxStage7Blink(5_110)).toBe(0);
  });

  it('keeps the source-layer equivalent scene below the existing stable structural budgets', () => {
    expect(NYX_STAGE7_MAX_LAYER_EQUIVALENT.drawCalls).toBeLessThanOrEqual(
      NYX_2D_STABLE_PERFORMANCE_BUDGET.maxDrawCalls,
    );
    expect(NYX_STAGE7_MAX_LAYER_EQUIVALENT.triangles).toBeLessThanOrEqual(
      NYX_2D_STABLE_PERFORMANCE_BUDGET.maxTriangles,
    );
    expect(NYX_STAGE7_MAX_LAYER_EQUIVALENT.geometries).toBeLessThanOrEqual(
      NYX_2D_STABLE_PERFORMANCE_BUDGET.maxGeometries,
    );
    expect(NYX_STAGE7_MAX_LAYER_EQUIVALENT.textures).toBeLessThanOrEqual(
      NYX_2D_STABLE_PERFORMANCE_BUDGET.maxTextures,
    );
  });
});
