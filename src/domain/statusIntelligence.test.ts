import { describe, expect, it } from 'vitest';
import type { ProviderSnapshot } from './types';
import { buildStatusIntelligence } from './statusIntelligence';

function snapshot(overrides: Partial<ProviderSnapshot> = {}): ProviderSnapshot {
  return {
    provider: 'codex',
    displayName: 'Codex',
    capabilities: ['quota'],
    quota: [{ id: 'weekly', label: '7d', usedPercent: 40, resetAt: '2026-09-04T12:00:00Z' }],
    quotaHistory: [],
    usage: [],
    sessions: [],
    freshness: 'fresh',
    updatedAt: '2026-09-03T07:00:00Z',
    ...overrides,
  };
}

const NOW = new Date('2026-09-03T08:00:00Z');

describe('buildStatusIntelligence', () => {
  it('recommends the fresh provider with the most constrained quota headroom', () => {
    const intelligence = buildStatusIntelligence([
      snapshot({ provider: 'codex', displayName: 'Codex', quota: [{ id: '7d', label: '7d', usedPercent: 55 }] }),
      snapshot({ provider: 'claude', displayName: 'Claude Code', quota: [{ id: '7d', label: '7d', usedPercent: 20 }] }),
      snapshot({ provider: 'cursor', displayName: 'Cursor', quota: [{ id: 'period', label: 'Current', usedPercent: 70 }] }),
    ], NOW);

    expect(intelligence.tone).toBe('nominal');
    expect(intelligence.recommendedProvider).toBe('claude');
    expect(intelligence.headline).toBe('Claude Code has the most available headroom');
    expect(intelligence.summary).toContain('80% left');
  });

  it('renders concise Traditional Chinese intelligence with standard time units without translating provider identities', () => {
    const intelligence = buildStatusIntelligence([
      snapshot({
        provider: 'claude',
        displayName: 'Claude Code',
        quota: [{ id: '7d', label: '7d', usedPercent: 20, resetAt: '2026-09-03T10:00:00Z' }],
      }),
      snapshot({ provider: 'cursor', displayName: 'Cursor', quota: [{ id: 'period', label: 'Current', usedPercent: 70 }] }),
    ], NOW, 'zh-TW');

    expect(intelligence.recommendedProvider).toBe('claude');
    expect(intelligence.headline).toBe('Claude Code 額度餘裕最多');
    expect(intelligence.summary).toContain('Claude Code 7d 剩 80%。');
    expect(intelligence.summary).toContain('Claude Code 7d 2h 後重置。');
    expect(intelligence.nearestReset?.windowLabel).toBe('7d');
  });

  it('escalates forecasted depletion before reset above ordinary headroom routing', () => {
    const intelligence = buildStatusIntelligence([
      snapshot({
        provider: 'claude',
        displayName: 'Claude Code',
        quota: [{ id: '5h', label: '5h', usedPercent: 80, resetAt: '2026-09-03T13:00:00Z' }],
        quotaHistory: [
          { at: '2026-09-03T06:00:00Z', windowId: '5h', usedPercent: 60 },
          { at: '2026-09-03T07:00:00Z', windowId: '5h', usedPercent: 70 },
          { at: '2026-09-03T08:00:00Z', windowId: '5h', usedPercent: 80 },
        ],
      }),
      snapshot({ provider: 'cursor', displayName: 'Cursor', quota: [{ id: 'period', label: 'Current', usedPercent: 30 }] }),
    ], NOW);

    expect(intelligence.tone).toBe('warning');
    expect(intelligence.headline).toBe('Claude Code may deplete before reset');
    expect(intelligence.signals[0]?.kind).toBe('depletion-risk');
    expect(intelligence.signals[0]?.provider).toBe('claude');
  });

  it('reports critical constrained quota without inventing a forecast', () => {
    const intelligence = buildStatusIntelligence([
      snapshot({
        provider: 'cursor',
        displayName: 'Cursor',
        quota: [{ id: 'period', label: 'Current', usedPercent: 94, resetAt: '2026-09-05T08:00:00Z' }],
      }),
    ], NOW);

    expect(intelligence.tone).toBe('warning');
    expect(intelligence.headline).toBe('Cursor capacity is critical');
    expect(intelligence.signals.some((signal) => signal.kind === 'low-capacity' && signal.remainingPercent === 6)).toBe(true);
  });

  it('keeps stale or unavailable providers out of capacity recommendations', () => {
    const intelligence = buildStatusIntelligence([
      snapshot({ provider: 'codex', displayName: 'Codex', freshness: 'stale' }),
      snapshot({ provider: 'claude', displayName: 'Claude Code', freshness: 'unavailable', quota: [] }),
    ], NOW);

    expect(intelligence.tone).toBe('offline');
    expect(intelligence.recommendedProvider).toBeUndefined();
    expect(intelligence.headline).toBe('No provider has a current quota signal');
  });

  it('surfaces active sessions and recent request project concentration without mixing thread totals', () => {
    const intelligence = buildStatusIntelligence([
      snapshot({
        provider: 'claude',
        displayName: 'Claude Code',
        capabilities: ['quota', 'usage', 'projectUsage', 'sessions'],
        sessions: [
          { id: 'a', provider: 'claude', project: 'cyboard-punk', status: 'active' },
          { id: 'b', provider: 'claude', project: 'lumen-lex', status: 'idle' },
        ],
        usage: [
          { at: '2026-09-03T07:50:00Z', tokens: 800, project: 'cyboard-punk', scope: 'request' },
          { at: '2026-09-03T07:40:00Z', tokens: 200, project: 'lumen-lex', scope: 'request' },
          { at: '2026-09-01T07:40:00Z', tokens: 9_999, project: 'old-project', scope: 'request' },
        ],
      }),
      snapshot({
        provider: 'codex',
        displayName: 'Codex',
        capabilities: ['quota', 'usage', 'projectUsage'],
        usage: [{ at: '2026-09-03T07:55:00Z', tokens: 50_000, project: 'thread-heavy', scope: 'thread-total' }],
      }),
    ], NOW);

    expect(intelligence.activeSessions).toBe(1);
    expect(intelligence.recentProject?.project).toBe('cyboard-punk');
    expect(intelligence.recentProject?.tokens).toBe(800);
    expect(intelligence.recentProject?.sharePercent).toBe(80);
    expect(intelligence.signals.some((signal) => signal.kind === 'active-sessions')).toBe(true);
    expect(intelligence.signals.some((signal) => signal.kind === 'recent-project' && signal.label.includes('cyboard-punk'))).toBe(true);
  });

  it('identifies the nearest future reset and ignores invalid or past timestamps', () => {
    const intelligence = buildStatusIntelligence([
      snapshot({
        provider: 'codex',
        displayName: 'Codex',
        quota: [
          { id: 'old', label: 'Old', usedPercent: 20, resetAt: '2026-09-03T07:00:00Z' },
          { id: 'soon', label: '5h', usedPercent: 30, resetAt: '2026-09-03T09:30:00Z' },
        ],
      }),
      snapshot({
        provider: 'cursor',
        displayName: 'Cursor',
        quota: [{ id: 'later', label: 'Current', usedPercent: 20, resetAt: 'not-a-date' }],
      }),
    ], NOW);

    expect(intelligence.nearestReset).toMatchObject({ provider: 'codex', windowLabel: '5h', minutesUntil: 90 });
  });
});
