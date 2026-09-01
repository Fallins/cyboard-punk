import { describe, expect, it } from 'vitest';
import type { ProviderSnapshot } from '../domain/types';
import { quotaAlerts, resetAlerts } from './rules';

const snapshot = (usedPercent: number): ProviderSnapshot => ({
  provider: 'codex',
  displayName: 'Codex',
  capabilities: ['quota'],
  quota: [{ id: 'weekly', label: '7d', usedPercent, resetAt: '2026-09-07T00:00:00Z' }],
  quotaHistory: [],
  usage: [],
  sessions: [],
  freshness: 'fresh',
  updatedAt: '2026-09-01T00:00:00Z',
});

describe('quotaAlerts', () => {
  it('selects the most severe crossed threshold only', () => {
    const alerts = quotaAlerts([snapshot(94)], [20, 10, 5]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ threshold: 10, remainingPercent: 6 });
  });

  it('does not alert above the configured thresholds', () => {
    expect(quotaAlerts([snapshot(50)], [20, 10, 5])).toEqual([]);
  });

  it('deduplicates by provider window reset and threshold', () => {
    const [alert] = quotaAlerts([snapshot(90)], [10]);
    expect(quotaAlerts([snapshot(90)], [10], new Set([alert.key]))).toEqual([]);
  });

  it('does not treat an unavailable quota as zero', () => {
    const unavailable = { ...snapshot(0), quota: [] };
    expect(quotaAlerts([unavailable], [20])).toEqual([]);
  });
});

describe('resetAlerts', () => {
  it('alerts once when a known reset enters the configured lead window', () => {
    const candidate = snapshot(40);
    candidate.quota[0].resetAt = '2026-09-01T12:10:00Z';
    const alerts = resetAlerts([candidate], 10, new Set(), new Date('2026-09-01T12:01:00Z'));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].title).toBe('Codex quota reset soon');
    expect(alerts[0].body).toContain('7d resets in about 9 min');
    expect(resetAlerts([candidate], 10, new Set([alerts[0].key]), new Date('2026-09-01T12:02:00Z'))).toEqual([]);
  });

  it('does not alert before the lead window or after reset', () => {
    const candidate = snapshot(40);
    candidate.quota[0].resetAt = '2026-09-01T13:00:00Z';
    expect(resetAlerts([candidate], 10, new Set(), new Date('2026-09-01T12:00:00Z'))).toEqual([]);
    expect(resetAlerts([candidate], 10, new Set(), new Date('2026-09-01T13:01:00Z'))).toEqual([]);
  });

  it('groups windows that reset at the same time into one notification', () => {
    const candidate = snapshot(40);
    candidate.quota = [
      { id: 'gemini-5h', label: 'Gemini 5h', usedPercent: 20, resetAt: '2026-09-01T12:10:00Z' },
      { id: 'claude-5h', label: 'Claude/GPT 5h', usedPercent: 30, resetAt: '2026-09-01T12:10:00Z' },
    ];
    const alerts = resetAlerts([candidate], 10, new Set(), new Date('2026-09-01T12:05:00Z'));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].body).toContain('Gemini 5h / Claude/GPT 5h reset');
  });

  it('supports disabling reset reminders with zero minutes', () => {
    expect(resetAlerts([snapshot(40)], 0)).toEqual([]);
  });
});
