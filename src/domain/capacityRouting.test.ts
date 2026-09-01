import { describe, expect, it } from 'vitest';
import type { ProviderSnapshot } from './types';
import { rankProvidersByQuotaHeadroom } from './capacityRouting';

function snapshot(
  provider: ProviderSnapshot['provider'],
  displayName: string,
  used: number[],
  freshness: ProviderSnapshot['freshness'] = 'fresh',
): ProviderSnapshot {
  return {
    provider,
    displayName,
    capabilities: used.length ? ['quota'] : [],
    quota: used.map((usedPercent, index) => ({
      id: `window-${index}`,
      label: index === 0 ? '5h' : '7d',
      usedPercent,
    })),
    quotaHistory: [],
    usage: [],
    sessions: [],
    freshness,
    updatedAt: '2026-09-01T00:00:00Z',
  };
}

describe('rankProvidersByQuotaHeadroom', () => {
  it('ranks by the most constrained lane rather than averaging windows', () => {
    const result = rankProvidersByQuotaHeadroom([
      snapshot('codex', 'Codex', [5, 80]),
      snapshot('claude', 'Claude Code', [30, 40]),
      snapshot('cursor', 'Cursor', [64, 28]),
    ]);

    expect(result.candidates.map((candidate) => candidate.provider)).toEqual([
      'claude',
      'cursor',
      'codex',
    ]);
    expect(result.recommended).toMatchObject({
      provider: 'claude',
      remainingPercent: 60,
      constrainedWindowLabel: '7d',
    });
  });

  it('excludes stale, unavailable and quota-less providers from recommendation', () => {
    const result = rankProvidersByQuotaHeadroom([
      snapshot('codex', 'Codex', [20]),
      snapshot('claude', 'Claude Code', [5], 'stale'),
      snapshot('cursor', 'Cursor', [], 'fresh'),
    ]);

    expect(result.recommended?.provider).toBe('codex');
    expect(result.excludedProviders).toEqual(['claude', 'cursor']);
  });

  it('returns no recommendation when no fresh quota exists', () => {
    const result = rankProvidersByQuotaHeadroom([
      snapshot('claude', 'Claude Code', [10], 'stale'),
      snapshot('cursor', 'Cursor', [], 'unavailable'),
    ]);
    expect(result.recommended).toBeUndefined();
    expect(result.candidates).toEqual([]);
  });
});
