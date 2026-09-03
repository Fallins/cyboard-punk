import { afterEach, describe, expect, it } from 'vitest';
import {
  NYX_2D_PRODUCTION_TUNING,
  NYX_2D_TEST_TUNING,
  clampNyx2DTuningValue,
  nyx2DRuntimeTuning,
  resetNyx2DRuntimeTuning,
  resolveNyx2DMotionTuning,
  setNyx2DRuntimeTuning,
} from './nyx2dTuning';

afterEach(() => resetNyx2DRuntimeTuning());

describe('NYX 2D motion tuning', () => {
  it('locks user-approved breathing and enables source-guided upper body motion', () => {
    expect(NYX_2D_PRODUCTION_TUNING).toEqual({
      breath: 2,
      arms: 1,
      torso: 1,
      head: 1,
    });
  });

  it('starts test controls from the production baseline', () => {
    expect(NYX_2D_TEST_TUNING).toEqual(NYX_2D_PRODUCTION_TUNING);
  });

  it('clamps live tuning to safe calibration ranges', () => {
    expect(clampNyx2DTuningValue('breath', -1)).toBe(0);
    expect(clampNyx2DTuningValue('breath', 9)).toBe(2.5);
    expect(clampNyx2DTuningValue('arms', 9)).toBe(1.25);
    expect(clampNyx2DTuningValue('torso', 9)).toBe(1.5);
    expect(clampNyx2DTuningValue('head', 9)).toBe(3);
  });

  it('falls back to production tuning when no override is supplied', () => {
    expect(resolveNyx2DMotionTuning()).toEqual(NYX_2D_PRODUCTION_TUNING);
  });

  it('updates all live calibration channels independently', () => {
    setNyx2DRuntimeTuning({ breath: 1.7, arms: 1.2, torso: 1.4, head: 2.5 });
    expect(nyx2DRuntimeTuning()).toEqual({ breath: 1.7, arms: 1.2, torso: 1.4, head: 2.5 });
    expect(resetNyx2DRuntimeTuning()).toEqual(NYX_2D_PRODUCTION_TUNING);
  });
});
