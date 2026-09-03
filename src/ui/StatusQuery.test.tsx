import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import type { StatusIntelligence } from '../domain/statusIntelligence';
import StatusQuery from './StatusQuery';

afterEach(cleanup);

const intelligence: StatusIntelligence = {
  tone: 'nominal',
  headline: 'Claude Code has the most available headroom',
  summary: 'Claude Code: 80% left on 7d. 1 active session. Cursor Current resets in 2h.',
  recommendedProvider: 'claude',
  activeSessions: 1,
  nearestReset: {
    provider: 'cursor',
    displayName: 'Cursor',
    windowLabel: 'Current',
    resetAt: '2026-09-03T10:00:00Z',
    minutesUntil: 120,
  },
  recentProject: { project: 'cyboard-punk', tokens: 900, sharePercent: 75 },
  signals: [],
};

describe('StatusQuery', () => {
  it('answers typed questions locally', async () => {
    render(() => <StatusQuery intelligence={intelligence} />);

    const input = screen.getByRole('textbox', { name: 'Ask CYBOARD about current status' });
    await fireEvent.input(input, { target: { value: 'next reset' } });
    await fireEvent.submit(screen.getByRole('form', { name: 'Ask CYBOARD' }));

    expect(screen.getByText('Cursor Current resets in 2h.')).toBeTruthy();
    expect(screen.getByText('RESET')).toBeTruthy();
  });

  it('runs suggested questions without network or async provider work', async () => {
    render(() => <StatusQuery intelligence={intelligence} />);

    await fireEvent.click(screen.getByRole('button', { name: 'Best provider' }));
    expect(screen.getByText(/Claude Code has the most available headroom/)).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Recent project' }));
    expect(screen.getByText(/cyboard-punk leads recent project-attributed request activity/)).toBeTruthy();
  });
});
