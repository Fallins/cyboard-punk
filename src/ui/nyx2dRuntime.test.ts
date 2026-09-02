import { describe, expect, it } from 'vitest';
import { nyx2DEmissiveAtTime, nyx2DFrameIntervalMs } from './nyx2dRuntime';
import { nyx2DEmissiveIntensity, nyx2DEmissivePulseAmplitude } from './nyx2dState';

describe('NYX 2D effect runtime', () => {
  it('starts at the approved static state brightness', () => {
    expect(nyx2DEmissiveAtTime('processing', 0)).toBeCloseTo(nyx2DEmissiveIntensity('processing'), 6);
  });

  it('never exceeds base plus the declared pulse amplitude', () => {
    const base = nyx2DEmissiveIntensity('warning');
    const max = base + nyx2DEmissivePulseAmplitude('warning');
    for (const time of [0, 120, 250, 500, 750, 1000, 2500]) {
      const value = nyx2DEmissiveAtTime('warning', time);
      expect(value).toBeGreaterThanOrEqual(base - 1e-6);
      expect(value).toBeLessThanOrEqual(max + 1e-6);
    }
  });

  it('stays completely static offline', () => {
    expect(nyx2DEmissiveAtTime('offline', 0)).toBe(0.05);
    expect(nyx2DEmissiveAtTime('offline', 999999)).toBe(0.05);
  });

  it('uses a capped deterministic frame interval', () => {
    expect(nyx2DFrameIntervalMs(24)).toBeCloseTo(1000 / 24, 6);
    expect(nyx2DFrameIntervalMs(120)).toBeCloseTo(1000 / 60, 6);
    expect(nyx2DFrameIntervalMs(0)).toBe(1000);
  });
});
