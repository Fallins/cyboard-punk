import { describe, expect, it } from 'vitest';
import type { ProviderSnapshot } from '../domain/types';
import { quotaAlerts } from './rules';

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
