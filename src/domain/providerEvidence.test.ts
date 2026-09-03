import { describe, expect, it } from 'vitest';
import type { ProviderSnapshot } from './types';
import { providerEvidence } from './providerEvidence';

function snapshot(overrides: Partial<ProviderSnapshot> = {}): ProviderSnapshot {
  return {
    provider: 'codex',
    displayName: 'Codex',
    capabilities: ['quota'],
    quota: [{ id: '5h', label: '5h', usedPercent: 10 }],
    quotaHistory: [],
    usage: [],
    sessions: [],
    freshness: 'fresh',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

describe('providerEvidence', () => {
  it('labels fresh non-cache quota snapshots as live', () => {
    expect(providerEvidence(snapshot())).toBe('LIVE');
    expect(
      providerEvidence(
        snapshot({
          source: { kind: 'remote-api', detail: 'chatgpt-oauth-usage', isFallback: false },
        }),
      ),
    ).toBe('LIVE');
  });

  it('labels explicit local cache snapshots as cache even while still fresh enough to reuse', () => {
    expect(
      providerEvidence(
        snapshot({
          source: { kind: 'local-cache', detail: 'claude-cyboard-cache', isFallback: false },
        }),
      ),
    ).toBe('CACHE');
  });

  it('labels stale snapshots as cache', () => {
    expect(providerEvidence(snapshot({ freshness: 'stale' }))).toBe('CACHE');
    expect(providerEvidence(snapshot({ issue: { code: 'stale-cache', message: 'cached' } }))).toBe('CACHE');
  });

  it('labels unavailable or quota-less snapshots as offline', () => {
    expect(
      providerEvidence(
        snapshot({
          source: { kind: 'unavailable', detail: 'login-required', isFallback: false },
        }),
      ),
    ).toBe('OFFLINE');
    expect(providerEvidence(snapshot({ freshness: 'unavailable', quota: [] }))).toBe('OFFLINE');
    expect(providerEvidence(snapshot({ quota: [] }))).toBe('OFFLINE');
  });
});
