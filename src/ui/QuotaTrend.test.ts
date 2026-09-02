import { describe, expect, it } from 'vitest';
import type { QuotaSample } from '../domain/types';
import { trendGeometry, trendPoints } from './QuotaTrend';

describe('quota trend geometry', () => {
  it('sorts samples by time and keeps every point inside the viewBox', () => {
    const samples: QuotaSample[] = [
      { at: '2026-09-01T00:02:00Z', windowId: '5h', usedPercent: 120 },
      { at: '2026-09-01T00:00:00Z', windowId: '5h', usedPercent: -10 },
      { at: '2026-09-01T00:01:00Z', windowId: '5h', usedPercent: 50 },
    ];

    const points = trendPoints(samples);
    const coordinates = points.split(' ').map((point) => point.split(',').map(Number));
    expect(coordinates).toHaveLength(3);
    for (const [x, y] of coordinates) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(240);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(46);
    }
  });

  it('drops invalid timestamps instead of producing invalid geometry', () => {
    const samples: QuotaSample[] = [
      { at: 'invalid', windowId: '5h', usedPercent: 10 },
      { at: '2026-09-01T00:00:00Z', windowId: '5h', usedPercent: 20 },
      { at: '2026-09-01T00:01:00Z', windowId: '5h', usedPercent: 30 },
    ];

    const geometry = trendGeometry(samples);
    expect(geometry.points.split(' ')).toHaveLength(2);
    expect(geometry.deltaUsed).toBe(10);
    expect(geometry.flat).toBe(false);
  });

  it('uses an adaptive domain so sub-percent changes remain visible', () => {
    const samples: QuotaSample[] = [
      { at: '2026-09-01T00:00:00Z', windowId: 'cursor-models', usedPercent: 64.1 },
      { at: '2026-09-01T00:01:00Z', windowId: 'cursor-models', usedPercent: 64.2 },
      { at: '2026-09-01T00:02:00Z', windowId: 'cursor-models', usedPercent: 64.4 },
    ];

    const geometry = trendGeometry(samples);
    const firstY = Number(geometry.points.split(' ')[0]!.split(',')[1]);
    expect(geometry.yMax - geometry.yMin).toBeLessThanOrEqual(4.001);
    expect(geometry.flat).toBe(false);
    expect(geometry.deltaUsed).toBeCloseTo(0.3, 8);
    expect(geometry.lastPoint).toBeDefined();
    expect(geometry.lastPoint!.y).toBeLessThan(firstY);
  });

  it('marks an unchanged upstream meter as flat', () => {
    const samples: QuotaSample[] = Array.from({ length: 24 }, (_, index) => ({
      at: `2026-09-01T${String(index).padStart(2, '0')}:00:00Z`,
      windowId: 'cursor-models',
      usedPercent: 64,
    }));

    const geometry = trendGeometry(samples);
    expect(geometry.flat).toBe(true);
    expect(geometry.deltaUsed).toBe(0);
    expect(geometry.areaPoints).toContain(geometry.points);
  });
});
