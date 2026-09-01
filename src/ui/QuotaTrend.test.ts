import { describe, expect, it } from 'vitest';
import type { QuotaSample } from '../domain/types';
import { trendPoints } from './QuotaTrend';

describe('trendPoints', () => {
  it('sorts samples by time and keeps every point inside the viewBox', () => {
    const samples: QuotaSample[] = [
      { at: '2026-09-01T00:02:00Z', windowId: '5h', usedPercent: 120 },
      { at: '2026-09-01T00:00:00Z', windowId: '5h', usedPercent: -10 },
      { at: '2026-09-01T00:01:00Z', windowId: '5h', usedPercent: 50 },
    ];

    expect(trendPoints(samples)).toBe('0.0,46.0 120.0,23.0 240.0,0.0');
  });

  it('drops invalid timestamps instead of producing out-of-bounds geometry', () => {
    const samples: QuotaSample[] = [
      { at: 'invalid', windowId: '5h', usedPercent: 10 },
      { at: '2026-09-01T00:00:00Z', windowId: '5h', usedPercent: 20 },
      { at: '2026-09-01T00:01:00Z', windowId: '5h', usedPercent: 30 },
    ];

    expect(trendPoints(samples)).toBe('0.0,36.8 240.0,32.2');
  });
});
