import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderSnapshot } from '../domain/types';

const snapshots: ProviderSnapshot[] = [
  {
    provider: 'codex',
    displayName: 'Codex',
    capabilities: ['quota'],
    quota: [
      { id: 'primary', label: '5h', usedPercent: 25 },
      { id: 'weekly', label: '7d', usedPercent: 85 },
    ],
    quotaHistory: [],
    usage: [],
    sessions: [],
    freshness: 'fresh',
    updatedAt: '2026-09-03T08:00:00Z',
  },
];

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('../providers/client', () => ({
  TauriProviderClient: class {
    refresh = refresh;
  },
}));
vi.mock('../settings/autostart', () => ({
  readLaunchAtLogin: vi.fn(async () => false),
  setLaunchAtLogin: vi.fn(async () => undefined),
}));
vi.mock('../notifications/service', () => ({ notifyQuotaAlerts: vi.fn(async () => 0) }));

import App from './App';

beforeEach(() => {
  refresh.mockResolvedValue(snapshots);
  localStorage.setItem(
    'cyboard.settings.v1',
    JSON.stringify({ language: 'zh-TW', operatorMode: 'off' }),
  );
});

afterEach(() => {
  cleanup();
  refresh.mockReset();
  localStorage.clear();
});

describe('App localization', () => {
  it('starts in Traditional Chinese and switches the full dashboard back to English immediately', async () => {
    render(() => <App />);

    expect(await screen.findByText('5H')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Provider 額度' })).toBeTruthy();
    expect(screen.getAllByText('7D').length).toBeGreaterThan(0);
    expect(screen.queryByText('5h')).toBeNull();
    expect(screen.getByRole('button', { name: '設定' })).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: '設定' }));
    const language = screen.getByRole('combobox', { name: '語言' }) as HTMLSelectElement;
    expect(language.value).toBe('zh-TW');
    await fireEvent.change(language, { target: { value: 'en' } });

    expect(await screen.findByText('5h')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Provider Quota' })).toBeTruthy();
    expect(screen.getAllByText('7d').length).toBeGreaterThan(0);
    expect(screen.queryByText('5H')).toBeNull();

    await waitFor(() => {
      const persisted = JSON.parse(localStorage.getItem('cyboard.settings.v1') ?? '{}');
      expect(persisted.language).toBe('en');
    });
  });
});
