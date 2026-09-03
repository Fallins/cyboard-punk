import { cleanup, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import type { SessionCloseout } from '../domain/sessionCloseout';
import SessionCloseouts, { formatObservedDuration } from './SessionCloseouts';

afterEach(cleanup);

const closeouts: SessionCloseout[] = [
  {
    provider: 'claude',
    displayName: 'Claude Code',
    sessionId: 'worker-a',
    project: 'cyboard-punk',
    startedAt: '2026-09-03T07:00:00Z',
    lastSeenAt: '2026-09-03T08:05:00Z',
    detectedAt: '2026-09-03T08:07:00Z',
    observedActiveMinutes: 65,
  },
];

describe('SessionCloseouts', () => {
  it('renders conservative metadata without claiming transcript or token attribution', () => {
    render(() => <SessionCloseouts closeouts={closeouts} />);

    expect(screen.getByText('Recent Closeouts')).toBeTruthy();
    expect(screen.getByText('Claude Code')).toBeTruthy();
    expect(screen.getByText('cyboard-punk')).toBeTruthy();
    expect(screen.getByText('OBSERVED 1h 5m')).toBeTruthy();
    expect(screen.getByText(/LAST SEEN/)).toBeTruthy();
    expect(screen.queryByText(/tokens/i)).toBeNull();
  });

  it('formats observed active duration compactly', () => {
    expect(formatObservedDuration(0)).toBe('<1m');
    expect(formatObservedDuration(42)).toBe('42m');
    expect(formatObservedDuration(65)).toBe('1h 5m');
    expect(formatObservedDuration(120)).toBe('2h');
  });
});
