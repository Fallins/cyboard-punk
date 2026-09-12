import { describe, expect, it } from 'vitest';
import { NYX_2D_STABLE_PERFORMANCE_BUDGET } from './nyx2dPerformance';
import {
  createNyxStage7MotionState,
  neutralNyxStage7MotionSample,
  NYX_STAGE7_MAX_LAYER_EQUIVALENT,
  resolveNyxStage7RuntimeTier,
  sampleNyxStage7Acknowledgement,
  sampleNyxStage7Blink,
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

  it('preserves the frozen acknowledgement peak and monotonic settle', () => {
    expect(sampleNyxStage7Acknowledgement(560)).toMatchObject({
      neckAngleDeg: 1.6,
      torsoAngleDeg: -0.9,
      shoulderAngleDeg: -14,
      elbowAngleDeg: -10,
      wristAdditionalDeg: -3,
      acknowledgementActive: true,
    });

    const peak = sampleNyxStage7Acknowledgement(560);
    const mid = sampleNyxStage7Acknowledgement(820);
    const late = sampleNyxStage7Acknowledgement(1100);
    const settled = sampleNyxStage7Acknowledgement(1400);
    for (const key of ['shoulderAngleDeg', 'elbowAngleDeg', 'wristAdditionalDeg'] as const) {
      expect(Math.abs(mid[key])).toBeLessThan(Math.abs(peak[key]));
      expect(Math.abs(late[key])).toBeLessThan(Math.abs(mid[key]));
      expect(settled[key]).toBe(0);
    }
    expect(settled.acknowledgementActive).toBe(false);
  });

  it('preserves the frozen 310 ms source-derived blink timing', () => {
    expect(sampleNyxStage7Blink(4_800)).toBe(0);
    expect(sampleNyxStage7Blink(4_895)).toBe(1);
    expect(sampleNyxStage7Blink(4_950)).toBe(1);
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
