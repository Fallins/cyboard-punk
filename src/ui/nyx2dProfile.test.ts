import { describe, expect, it } from 'vitest';
import { nyx2DProfileFeatures, resolveNyx2DRuntimeProfile } from './nyx2dProfile';

describe('NYX 2D runtime profiles', () => {
  it('uses stable by default', () => {
    expect(resolveNyx2DRuntimeProfile(undefined)).toBe('stable');
    expect(resolveNyx2DRuntimeProfile('')).toBe('stable');
    expect(resolveNyx2DRuntimeProfile('unexpected')).toBe('stable');
  });

  it('requires an explicit enhanced profile', () => {
    expect(resolveNyx2DRuntimeProfile('enhanced')).toBe('enhanced');
    expect(resolveNyx2DRuntimeProfile('ENHANCED')).toBe('enhanced');
  });

  it('keeps all graduated life-motion channels in stable while blink stays gated', () => {
    expect(nyx2DProfileFeatures('stable')).toEqual({
      head: true,
      breath: true,
      gaze: true,
      hair: true,
      gestures: true,
      blink: false,
    });
    expect(nyx2DProfileFeatures('enhanced')).toEqual({
      head: true,
      breath: true,
      gaze: true,
      hair: true,
      gestures: true,
      blink: false,
    });
  });
});
