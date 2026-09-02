import { describe, expect, it } from 'vitest';
import {
  nyx2DBlinkAmountAtTime,
  nyx2DBlinkEnabled,
  nyx2DShouldAnimateBlink,
} from './nyx2dBlink';

describe('NYX 2D blink cadence', () => {
  it('is opt-in only', () => {
    expect(nyx2DBlinkEnabled('1')).toBe(true);
    expect(nyx2DBlinkEnabled('true')).toBe(true);
    expect(nyx2DBlinkEnabled(undefined)).toBe(false);
    expect(nyx2DBlinkEnabled('0')).toBe(false);
  });

  it('honors lifecycle and reduced motion', () => {
    expect(nyx2DShouldAnimateBlink('idle', true, false, true)).toBe(true);
    expect(nyx2DShouldAnimateBlink('idle', false, false, true)).toBe(false);
    expect(nyx2DShouldAnimateBlink('idle', true, true, true)).toBe(false);
    expect(nyx2DShouldAnimateBlink('idle', true, false, false)).toBe(false);
    expect(nyx2DShouldAnimateBlink('offline', true, false, true)).toBe(false);
  });

  it('stays open at startup and fully closes during a blink', () => {
    expect(nyx2DBlinkAmountAtTime('idle', 0)).toBe(0);
    // First idle blink begins at 4200 - 325 = 3875ms; 3980ms is the close peak.
    expect(nyx2DBlinkAmountAtTime('idle', 3980)).toBeGreaterThan(0.95);
  });

  it('keeps output bounded', () => {
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success', 'offline'] as const) {
      for (let time = 0; time <= 30000; time += 73) {
        const amount = nyx2DBlinkAmountAtTime(state, time);
        expect(amount).toBeGreaterThanOrEqual(0);
        expect(amount).toBeLessThanOrEqual(1);
      }
    }
  });
});
