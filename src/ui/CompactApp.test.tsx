import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderSnapshot } from '../domain/types';

const data: ProviderSnapshot[] = [
  {
    provider: 'codex',
    displayName: 'Codex',
    capabilities: ['quota'],
    quota: [
      { id: 'primary', label: '5h', usedPercent: 25 },
      { id: 'secondary', label: '7d', usedPercent: 85 },
    ],
    quotaHistory: [],
    usage: [],
    sessions: [{ id: '1', provider: 'codex', status: 'active', project: 'cyboard-punk' }],
    freshness: 'fresh',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const { refresh, hideCompact, showMain, focusMain, unminimizeMain, getByLabel } = vi.hoisted(() => {
  const hide = vi.fn(async () => undefined);
  const show = vi.fn(async () => undefined);
  const setFocus = vi.fn(async () => undefined);
  const unminimize = vi.fn(async () => undefined);
  return {
    refresh: vi.fn(),
    hideCompact: hide,
    showMain: show,
    focusMain: setFocus,
    unminimizeMain: unminimize,
    getByLabel: vi.fn(async (label: string) => {
      if (label === 'compact') return { hide };
      if (label === 'main') return { show, setFocus, unminimize };
      return null;
    }),
  };
});
vi.mock('../providers/client', () => ({
  TauriProviderClient: class {
    refresh = refresh;
  },
}));
vi.mock('@tauri-apps/api/webviewWindow', () => ({ WebviewWindow: { getByLabel } }));

import CompactApp from './CompactApp';

beforeEach(() => {
  refresh.mockResolvedValue(data);
});

afterEach(() => {
  cleanup();
  refresh.mockReset();
  getByLabel.mockClear();
  hideCompact.mockClear();
  showMain.mockClear();
  focusMain.mockClear();
  unminimizeMain.mockClear();
  localStorage.clear();
});

describe('CompactApp', () => {
  it('shows remaining quota, command summary, and constrained windows', async () => {
    render(() => <CompactApp />);
    expect(await screen.findByText('75%')).toBeTruthy();
    expect(screen.getByText('15%')).toBeTruthy();
    expect(screen.getByText('5h')).toBeTruthy();
    expect(screen.getByText('7d')).toBeTruthy();
    expect(screen.getAllByText('left')).toHaveLength(2);
    expect(screen.getByText('PROVIDERS')).toBeTruthy();
    expect(screen.getByText('ACTIVE')).toBeTruthy();
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByText('session')).toBeTruthy();
    expect(screen.getByLabelText('Codex fresh')).toBeTruthy();
    expect(screen.getByText('15%').closest('.compact-window')?.getAttribute('data-tone')).toBe('warning');
  });

  it('uses the persisted Traditional Chinese presentation with standard compact time units', async () => {
    localStorage.setItem('cyboard.settings.v1', JSON.stringify({ language: 'zh-TW' }));
    render(() => <CompactApp />);

    expect(await screen.findByText('Codex')).toBeTruthy();
    expect(screen.getByText('5h')).toBeTruthy();
    expect(screen.getByText('7d')).toBeTruthy();
    expect(screen.queryByText('5H')).toBeNull();
    expect(screen.queryByText('7D')).toBeNull();
    expect(screen.getAllByText('剩餘')).toHaveLength(2);
    expect(screen.getByText('快速面板')).toBeTruthy();
    expect(screen.getByLabelText('Codex 即時')).toBeTruthy();
    expect(screen.getByRole('button', { name: '開啟 Dashboard' })).toBeTruthy();
  });

  it('opens and focuses the dashboard then closes the compact menu', async () => {
    render(() => <CompactApp />);
    await screen.findByText('Codex');
    fireEvent.click(screen.getByRole('button', { name: 'OPEN DASHBOARD' }));

    await waitFor(() => {
      expect(getByLabel).toHaveBeenCalledWith('main');
      expect(unminimizeMain).toHaveBeenCalledTimes(1);
      expect(showMain).toHaveBeenCalledTimes(1);
      expect(focusMain).toHaveBeenCalledTimes(1);
      expect(getByLabel).toHaveBeenCalledWith('compact');
      expect(hideCompact).toHaveBeenCalledTimes(1);
    });
  });

  it('closes the compact menu with Escape', async () => {
    render(() => <CompactApp />);
    await screen.findByText('Codex');
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(getByLabel).toHaveBeenCalledWith('compact');
    expect(hideCompact).toHaveBeenCalledTimes(1);
  });
});
