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
  it('labels normal non-Antigravity snapshots as live without guessing the transport', () => {
    expect(providerEvidence(snapshot())).toBe('LIVE');
  });

  it('distinguishes Antigravity local and cloud evidence', () => {
    expect(providerEvidence(snapshot({ provider: 'antigravity', displayName: 'Antigravity' }))).toBe('LOCAL');
    expect(providerEvidence(snapshot({
      provider: 'antigravity',
      displayName: 'Antigravity',
      quota: [{ id: 'cloud', label: 'Gemini Cloud', usedPercent: 20 }],
    }))).toBe('CLOUD');
  });

  it('prefers cache and offline states over provider-specific inference', () => {
    expect(providerEvidence(snapshot({ freshness: 'stale' }))).toBe('CACHE');
    expect(providerEvidence(snapshot({ freshness: 'unavailable', quota: [] }))).toBe('OFFLINE');
  });
});
