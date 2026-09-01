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

  it('does not forecast from only two samples', () => {
    const result = forecastQuota(
      { id: 'weekly', label: 'Weekly', usedPercent: 60, resetAt: '2026-09-02T12:00:00.000Z' },
      [
        { at: '2026-09-01T00:00:00.000Z', windowId: 'weekly', usedPercent: 40 },
        { at: '2026-09-01T04:00:00.000Z', windowId: 'weekly', usedPercent: 60 },
      ],
      now,
    );

    expect(result.burnPercentPerHour).toBeUndefined();
    expect(result.projectedDepletionAt).toBeUndefined();
    expect(result.willDepleteBeforeReset).toBe(false);
  });

  it('projects depletion before reset only after enough observation history', () => {
    const result = forecastQuota(
      { id: 'weekly', label: 'Weekly', usedPercent: 60, resetAt: '2026-09-02T12:00:00.000Z' },
      [
        { at: '2026-09-01T00:00:00.000Z', windowId: 'weekly', usedPercent: 40 },
        { at: '2026-09-01T02:00:00.000Z', windowId: 'weekly', usedPercent: 50 },
        { at: '2026-09-01T04:00:00.000Z', windowId: 'weekly', usedPercent: 60 },
      ],
      now,
    );

    expect(result.burnPercentPerHour).toBe(5);
    expect(result.projectedDepletionAt).toBe('2026-09-01T12:00:00.000Z');
    expect(result.willDepleteBeforeReset).toBe(true);
  });

  it('does not forecast from a very short observation burst', () => {
    const result = forecastQuota(
      { id: 'weekly', label: 'Weekly', usedPercent: 60, resetAt: '2026-09-02T12:00:00.000Z' },
      [
        { at: '2026-09-01T03:50:00.000Z', windowId: 'weekly', usedPercent: 40 },
        { at: '2026-09-01T03:55:00.000Z', windowId: 'weekly', usedPercent: 50 },
        { at: '2026-09-01T04:00:00.000Z', windowId: 'weekly', usedPercent: 60 },
      ],
      now,
    );

    expect(result.projectedDepletionAt).toBeUndefined();
    expect(result.willDepleteBeforeReset).toBe(false);
  });

  it('ignores history from another quota window', () => {
    const result = forecastQuota(
      { id: 'weekly', label: 'Weekly', usedPercent: 60 },
      [
        { at: '2026-09-01T00:00:00.000Z', windowId: 'five-hour', usedPercent: 20 },
        { at: '2026-09-01T02:00:00.000Z', windowId: 'five-hour', usedPercent: 40 },
        { at: '2026-09-01T04:00:00.000Z', windowId: 'five-hour', usedPercent: 60 },
      ],
      now,
    );
    expect(result.burnPercentPerHour).toBeUndefined();
  });

  it('ignores decreasing counters as a reset', () => {
    const result = forecastQuota(
      { id: 'weekly', label: 'Weekly', usedPercent: 10 },
      [
        { at: '2026-09-01T00:00:00.000Z', windowId: 'weekly', usedPercent: 90 },
        { at: '2026-09-01T02:00:00.000Z', windowId: 'weekly', usedPercent: 45 },
        { at: '2026-09-01T04:00:00.000Z', windowId: 'weekly', usedPercent: 10 },
      ],
      now,
    );
    expect(result.burnPercentPerHour).toBeUndefined();
    expect(result.projectedDepletionAt).toBeUndefined();
  });
});
