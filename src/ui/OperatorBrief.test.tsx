import { cleanup, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import type { StatusIntelligence } from '../domain/statusIntelligence';
import OperatorBrief from './OperatorBrief';

afterEach(cleanup);

function intelligence(overrides: Partial<StatusIntelligence> = {}): StatusIntelligence {
  return {
    tone: 'nominal',
    headline: 'Claude Code has the most available headroom',
    summary: 'Claude Code: 80% left on 7d. 1 active session. Cursor Current resets in 2h.',
    recommendedProvider: 'claude',
    activeSessions: 1,
    signals: [
      {
        kind: 'active-sessions',
        tone: 'nominal',
        label: '1 active session',
        detail: 'Live agent activity is currently detected.',
      },
      {
        kind: 'recent-project',
        tone: 'nominal',
        label: 'Recent request activity led by cyboard-punk',
        detail: '80% of project-attributed request tokens in the last 24 hours.',
      },
    ],
    ...overrides,
  };
}

describe('OperatorBrief', () => {
  it('renders deterministic intelligence with provider routing and evidence signals', () => {
    render(() => <OperatorBrief intelligence={intelligence()} />);

    expect(screen.getByRole('region', { name: 'System Brief' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'System Brief' })).toBeTruthy();
    expect(screen.getByText('Claude Code has the most available headroom')).toBeTruthy();
    expect(screen.getByText(/80% left on 7d/)).toBeTruthy();
    expect(screen.getByText('Recent request activity led by cyboard-punk')).toBeTruthy();
    expect(screen.getByText('NOMINAL')).toBeTruthy();
  });

  it('announces only the concise status summary instead of the full brief region', () => {
    render(() => <OperatorBrief intelligence={intelligence()} />);

    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toContain('nominal: Claude Code has the most available headroom');
  });

  it('exposes warning tone without adding invented operator copy', () => {
    render(() => (
      <OperatorBrief
        intelligence={intelligence({
          tone: 'warning',
          headline: 'Claude Code may deplete before reset',
          signals: [
            {
              kind: 'depletion-risk',
              tone: 'warning',
              provider: 'claude',
              remainingPercent: 18,
              label: 'Claude Code may deplete before reset',
              detail: '5h has 18% left at the current measured burn rate.',
            },
          ],
        })}
      />
    ));

    expect(screen.getByText('WARNING')).toBeTruthy();
    expect(screen.getAllByText('Claude Code may deplete before reset').length).toBeGreaterThan(0);
    expect(screen.getByText('5h has 18% left at the current measured burn rate.')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('warning: Claude Code may deplete before reset');
  });
});
