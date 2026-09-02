import { describe, expect, it } from 'vitest';
import {
  nyx2DEmissiveIntensity,
  nyx2DEmissivePulseAmplitude,
  nyx2DEmissivePulseHz,
  nyx2DShouldAnimateEffects,
} from './nyx2dState';

describe('NYX 2D state effects', () => {
  it('keeps offline dimmest and success brightest', () => {
    expect(nyx2DEmissiveIntensity('offline')).toBe(0.05);
    expect(nyx2DEmissiveIntensity('idle')).toBe(0.16);
    expect(nyx2DEmissiveIntensity('observing')).toBe(0.24);
    expect(nyx2DEmissiveIntensity('processing')).toBe(0.34);
    expect(nyx2DEmissiveIntensity('warning')).toBe(0.48);
    expect(nyx2DEmissiveIntensity('success')).toBe(0.58);
  });

  it('keeps pulse subtle and disables it offline', () => {
    expect(nyx2DEmissivePulseAmplitude('offline')).toBe(0);
    expect(nyx2DEmissivePulseAmplitude('idle')).toBeLessThanOrEqual(0.025);
    expect(nyx2DEmissivePulseAmplitude('warning')).toBeLessThanOrEqual(0.075);
    expect(nyx2DEmissivePulseAmplitude('success')).toBeLessThanOrEqual(0.11);
    expect(nyx2DEmissivePulseHz('processing')).toBeLessThan(1);
  });

  it('only animates when visible and reduced motion is not requested', () => {
    expect(nyx2DShouldAnimateEffects('processing', true, false)).toBe(true);
    expect(nyx2DShouldAnimateEffects('processing', false, false)).toBe(false);
    expect(nyx2DShouldAnimateEffects('processing', true, true)).toBe(false);
    expect(nyx2DShouldAnimateEffects('offline', true, false)).toBe(false);
  });
});
