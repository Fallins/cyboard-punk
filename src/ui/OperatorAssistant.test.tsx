import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StatusIntelligence } from '../domain/statusIntelligence';
import { I18nProvider } from '../i18n/context';

vi.mock('./Nyx2DManagedRuntime', () => ({
  default: () => null,
}));

import OperatorStage from './OperatorStage';
import type { OperatorProviderPanel } from './operatorRuntime';

afterEach(cleanup);

const providers: OperatorProviderPanel[] = [
  { provider: 'codex', label: 'Codex', state: 'ready', remainingPercent: 82 },
  { provider: 'claude', label: 'Claude Code', state: 'warning', remainingPercent: 21 },
  { provider: 'cursor', label: 'Cursor', state: 'ready', remainingPercent: 64 },
];

const intelligence: StatusIntelligence = {
  tone: 'advisory',
  headline: 'Codex has the most available headroom',
  summary: 'Codex: 82% left on 7d. 2 active sessions. Cursor Current resets in 2h.',
  recommendedProvider: 'codex',
  activeSessions: 2,
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

describe('NYX quick status interactions', () => {
  it('answers deterministic quick actions inside the NYX stage', async () => {
    render(() => (
      <OperatorStage
        mode="female"
        readyProviders={2}
        totalProviders={3}
        activeAgents={2}
        providers={providers}
        briefHeadline={intelligence.headline}
        briefTone={intelligence.tone}
        assistantIntelligence={intelligence}
      />
    ));

    const actions = screen.getByRole('group', { name: 'NYX quick status actions' });
    expect(actions).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Best provider' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next reset' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ACTIVE AGENTS' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recent project' })).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Next reset' }));
    expect(screen.getByText('Cursor Current resets in 2h.')).toBeTruthy();
    expect(screen.getAllByText('NYX').length).toBeGreaterThan(1);
    expect(screen.getByRole('button', { name: 'Next reset' }).getAttribute('aria-pressed')).toBe('true');

    await fireEvent.click(screen.getByRole('button', { name: 'Recent project' }));
    expect(screen.getByText(/cyboard-punk leads recent project-attributed request activity/)).toBeTruthy();
  });

  it('answers the same fixed actions in concise Traditional Chinese', async () => {
    render(() => (
      <I18nProvider language="zh-TW">
        <OperatorStage
          mode="female"
          readyProviders={2}
          totalProviders={3}
          activeAgents={2}
          providers={providers}
          briefHeadline="Codex 額度餘裕最多"
          briefTone={intelligence.tone}
          assistantIntelligence={intelligence}
        />
      </I18nProvider>
    ));

    expect(screen.getByRole('group', { name: 'NYX 快捷查詢' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: '下次重置' }));
    expect(screen.getByText('Cursor Current 2H 後重置。')).toBeTruthy();
  });

  it('keeps NYX quick actions off the AXON preview', () => {
    render(() => (
      <OperatorStage
        mode="male"
        readyProviders={2}
        totalProviders={3}
        activeAgents={0}
        providers={providers}
        briefHeadline={intelligence.headline}
        briefTone={intelligence.tone}
        assistantIntelligence={intelligence}
      />
    ));

    expect(screen.queryByRole('group', { name: 'NYX quick status actions' })).toBeNull();
  });
});
