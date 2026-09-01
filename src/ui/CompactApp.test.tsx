import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

const refresh = vi.fn(async () => data);
const hideCompact = vi.fn(async () => undefined);
const getByLabel = vi.fn(async (label: string) => label === 'compact' ? { hide: hideCompact } : null);
vi.mock('../providers/client', () => ({ TauriProviderClient: class { refresh = refresh; } }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({ WebviewWindow: { getByLabel } }));

import CompactApp from './CompactApp';

afterEach(() => {
  cleanup();
  refresh.mockClear();
  getByLabel.mockClear();
  hideCompact.mockClear();
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

  it('closes the compact menu with Escape', async () => {
    render(() => <CompactApp />);
    await screen.findByText('Codex');
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(getByLabel).toHaveBeenCalledWith('compact');
    expect(hideCompact).toHaveBeenCalledTimes(1);
  });
});
