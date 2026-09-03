import { describe, expect, it } from 'vitest';
import type { ProviderSnapshot } from './types';
import { emptySessionCloseoutState, observeSessionCloseouts } from './sessionCloseout';

function snapshot(overrides: Partial<ProviderSnapshot> = {}): ProviderSnapshot {
  return {
    provider: 'claude',
    displayName: 'Claude Code',
    capabilities: ['quota', 'sessions'],
    quota: [{ id: '5h', label: '5h', usedPercent: 40 }],
    quotaHistory: [],
    usage: [],
    sessions: [],
    freshness: 'fresh',
    updatedAt: '2026-09-03T08:00:00Z',
    ...overrides,
  };
}

describe('session closeouts', () => {
  it('requires two consecutive fresh observations before treating a missing active session as closed', () => {
    const active = snapshot({
      sessions: [
        {
          id: 'worker-a',
          provider: 'claude',
          project: 'cyboard-punk',
          status: 'active',
          startedAt: '2026-09-03T07:00:00Z',
        },
      ],
    });

    const first = observeSessionCloseouts(emptySessionCloseoutState(), [active], new Date('2026-09-03T08:00:00Z'));
    const oneMiss = observeSessionCloseouts(first, [snapshot()], new Date('2026-09-03T08:01:00Z'));
    const closed = observeSessionCloseouts(oneMiss, [snapshot()], new Date('2026-09-03T08:02:00Z'));

    expect(first.closeouts).toEqual([]);
    expect(oneMiss.closeouts).toEqual([]);
    expect(closed.closeouts).toHaveLength(1);
    expect(closed.closeouts[0]).toMatchObject({
      provider: 'claude',
      displayName: 'Claude Code',
      sessionId: 'worker-a',
      project: 'cyboard-punk',
      lastSeenAt: '2026-09-03T08:00:00.000Z',
      detectedAt: '2026-09-03T08:02:00.000Z',
      observedActiveMinutes: 60,
    });
  });

  it('cancels a pending closeout if the same session returns on the next observation', () => {
    const active = snapshot({ sessions: [{ id: 'worker-a', provider: 'claude', status: 'active' }] });
    const first = observeSessionCloseouts(emptySessionCloseoutState(), [active], new Date('2026-09-03T08:00:00Z'));
    const miss = observeSessionCloseouts(first, [snapshot()], new Date('2026-09-03T08:01:00Z'));
    const returned = observeSessionCloseouts(miss, [active], new Date('2026-09-03T08:02:00Z'));

    expect(returned.closeouts).toEqual([]);
    expect(Object.values(returned.tracked)[0]?.misses).toBe(0);
  });

  it('does not count stale or unavailable provider snapshots as evidence that a session ended', () => {
    const active = snapshot({ sessions: [{ id: 'worker-a', provider: 'claude', status: 'active' }] });
    const first = observeSessionCloseouts(emptySessionCloseoutState(), [active], new Date('2026-09-03T08:00:00Z'));
    const stale = snapshot({ freshness: 'stale', sessions: [] });
    const afterStale = observeSessionCloseouts(first, [stale], new Date('2026-09-03T08:04:00Z'));
    const unavailable = snapshot({ freshness: 'unavailable', quota: [], sessions: [] });
    const later = observeSessionCloseouts(afterStale, [unavailable], new Date('2026-09-03T08:05:00Z'));

    expect(afterStale.closeouts).toEqual([]);
    expect(later.closeouts).toEqual([]);
    expect(Object.values(later.tracked)[0]?.misses).toBe(0);
  });

  it('does not count a fresh quota snapshot without a successful session observation', () => {
    const active = snapshot({ sessions: [{ id: 'worker-a', provider: 'claude', status: 'active' }] });
    const first = observeSessionCloseouts(emptySessionCloseoutState(), [active], new Date('2026-09-03T08:00:00Z'));
    const quotaOnly = snapshot({ capabilities: ['quota'], sessions: [] });
    const later = observeSessionCloseouts(first, [quotaOnly], new Date('2026-09-03T08:05:00Z'));

    expect(later.closeouts).toEqual([]);
    expect(Object.values(later.tracked)[0]?.misses).toBe(0);
  });

  it('keeps closeouts bounded and newest first', () => {
    let state = emptySessionCloseoutState();
    for (let index = 0; index < 15; index += 1) {
      const minute = String(index).padStart(2, '0');
      const active = snapshot({ sessions: [{ id: `worker-${index}`, provider: 'claude', status: 'active' }] });
      state = observeSessionCloseouts(state, [active], new Date(`2026-09-03T08:${minute}:00Z`));
      state = observeSessionCloseouts(state, [snapshot()], new Date(`2026-09-03T09:${minute}:00Z`));
      state = observeSessionCloseouts(state, [snapshot()], new Date(`2026-09-03T10:${minute}:00Z`));
    }

    expect(state.closeouts.length).toBeLessThanOrEqual(12);
    expect(state.closeouts[0]?.sessionId).toBe('worker-14');
  });
});
