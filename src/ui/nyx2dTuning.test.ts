import { describe, expect, it } from 'vitest';
import {
  NYX_2D_PRODUCTION_TUNING,
  NYX_2D_TEST_TUNING,
  clampNyx2DTuningValue,
  nyx2DGestureCssVariables,
  resolveNyx2DMotionTuning,
} from './nyx2dTuning';

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

  it('emits concrete CSS values for entry gesture calibration', () => {
    const css = nyx2DGestureCssVariables(3);
    expect(css).toContain('--nyx-attention-y:-9.000px');
    expect(css).toContain('--nyx-success-y:-12.000px');
    expect(css).toContain('--nyx-focus-y:7.800px');
  });
});
