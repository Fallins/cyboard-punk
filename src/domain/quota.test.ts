import { describe, expect, it } from 'vitest';
import type { ProviderSnapshot } from './types';
import { clampPercent, mostConstrainedQuota, mostConstrainedRemaining, quotaRemainingPercent } from './quota';

const snapshot = (): ProviderSnapshot => ({
  provider: 'codex',
  displayName: 'Codex',
  capabilities: ['quota'],
  quota: [
    { id: '5h', label: '5h', usedPercent: 18 },
    { id: '7d', label: '7d', usedPercent: 79 },
  ],
  quotaHistory: [],
  usage: [],
  sessions: [],
  freshness: 'fresh',
  updatedAt: '2026-09-01T00:00:00Z',
});

describe('quota capacity helpers', () => {
  it('selects the window with the least remaining capacity', () => {
    const selected = mostConstrainedQuota(snapshot());
    expect(selected?.id).toBe('7d');
    expect(mostConstrainedRemaining(snapshot())).toBe(21);
  });

  it('clamps malformed percentages before calculating remaining capacity', () => {
    expect(clampPercent(140)).toBe(100);
    expect(clampPercent(-10)).toBe(0);
    expect(quotaRemainingPercent({ id: 'x', label: 'x', usedPercent: 140 })).toBe(0);
  });

  it('returns undefined when a provider has no quota windows', () => {
    const empty = snapshot();
    empty.quota = [];
    expect(mostConstrainedQuota(empty)).toBeUndefined();
    expect(mostConstrainedRemaining(empty)).toBeUndefined();
  });
});
