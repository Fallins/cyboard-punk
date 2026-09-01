import { describe, expect, it } from 'vitest';
import { forecastQuota } from './forecast';

const now = new Date('2026-09-01T04:00:00.000Z');

describe('forecastQuota', () => {
  it('clamps impossible provider percentages', () => {
    expect(forecastQuota({ id: 'weekly', label: 'Weekly', usedPercent: 120 }, [], now)).toMatchObject({
      usedPercent: 100,
      remainingPercent: 0,
      willDepleteBeforeReset: true,
    });
  });

  it('does not invent a burn rate without history', () => {
    expect(forecastQuota({ id: 'weekly', label: 'Weekly', usedPercent: 40 }, [], now)).toEqual({
      usedPercent: 40,
      remainingPercent: 60,
      resetAt: undefined,
      willDepleteBeforeReset: false,
    });
  });

  it('projects depletion before reset from normalized percent samples', () => {
    const result = forecastQuota(
      { id: 'weekly', label: 'Weekly', usedPercent: 60, resetAt: '2026-09-02T12:00:00.000Z' },
      [
        { at: '2026-09-01T00:00:00.000Z', requests: 40 },
        { at: '2026-09-01T04:00:00.000Z', requests: 60 },
      ],
      now,
    );

    expect(result.burnPercentPerHour).toBe(5);
    expect(result.projectedDepletionAt).toBe('2026-09-01T12:00:00.000Z');
    expect(result.willDepleteBeforeReset).toBe(true);
  });

  it('ignores decreasing counters as a reset', () => {
    const result = forecastQuota(
      { id: 'weekly', label: 'Weekly', usedPercent: 10 },
      [
        { at: '2026-09-01T00:00:00.000Z', requests: 90 },
        { at: '2026-09-01T04:00:00.000Z', requests: 10 },
      ],
      now,
    );
    expect(result.burnPercentPerHour).toBe(0);
    expect(result.projectedDepletionAt).toBeUndefined();
  });
});
