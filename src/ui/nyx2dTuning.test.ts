import { afterEach, describe, expect, it } from 'vitest';
import {
  NYX_2D_PRODUCTION_TUNING,
  NYX_2D_TEST_TUNING,
  clampNyx2DTuningValue,
  nyx2DGestureCssVariables,
  nyx2DRuntimeTuning,
  resetNyx2DRuntimeTuning,
  resolveNyx2DMotionTuning,
  setNyx2DRuntimeTuning,
} from './nyx2dTuning';

afterEach(() => resetNyx2DRuntimeTuning());

describe('NYX 2D motion tuning', () => {
  it('keeps production semantic channels at 1x while lifting breathing modestly', () => {
    expect(NYX_2D_PRODUCTION_TUNING).toEqual({
      breath: 1.25,
      gesture: 1,
      stance: 1,
      head: 1,
    });
  });

  it('uses intentionally exaggerated test defaults', () => {
    expect(NYX_2D_TEST_TUNING.gesture).toBeGreaterThan(NYX_2D_PRODUCTION_TUNING.gesture);
    expect(NYX_2D_TEST_TUNING.stance).toBeGreaterThan(NYX_2D_PRODUCTION_TUNING.stance);
    expect(NYX_2D_TEST_TUNING.head).toBeGreaterThan(NYX_2D_PRODUCTION_TUNING.head);
  });

  it('clamps live tuning to safe calibration ranges', () => {
    expect(clampNyx2DTuningValue('breath', -1)).toBe(0);
    expect(clampNyx2DTuningValue('breath', 9)).toBe(2);
    expect(clampNyx2DTuningValue('gesture', 9)).toBe(5);
    expect(clampNyx2DTuningValue('stance', 9)).toBe(5);
    expect(clampNyx2DTuningValue('head', 9)).toBe(3);
  });

  it('falls back to production tuning when no override is supplied', () => {
    expect(resolveNyx2DMotionTuning()).toEqual(NYX_2D_PRODUCTION_TUNING);
  });

  it('updates the per-frame runtime tuning without persisting app settings', () => {
    setNyx2DRuntimeTuning({ breath: 1.7, head: 2.5 });
    expect(nyx2DRuntimeTuning()).toMatchObject({ breath: 1.7, head: 2.5 });
    expect(resetNyx2DRuntimeTuning()).toEqual(NYX_2D_PRODUCTION_TUNING);
  });

  it('emits concrete CSS values for entry gesture calibration', () => {
    const css = nyx2DGestureCssVariables(3);
    expect(css).toContain('--nyx-attention-y:-9.000px');
    expect(css).toContain('--nyx-success-y:-12.000px');
    expect(css).toContain('--nyx-focus-y:7.800px');
    expect(css).toContain('--nyx-success-scale:1.0180');
  });

  it('makes 0x entry gesture a true neutral transform', () => {
    const css = nyx2DGestureCssVariables(0);
    expect(css).toContain('--nyx-attention-y:0.000px');
    expect(css).toContain('--nyx-focus-scale-y:1.0000');
    expect(css).toContain('--nyx-alert-scale-x:1.0000');
    expect(css).toContain('--nyx-success-scale:1.0000');
  });
});
