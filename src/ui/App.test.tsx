import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderSnapshot } from '../domain/types';

const snapshots: ProviderSnapshot[] = [
  {
    provider: 'codex',
    displayName: 'Codex',
    capabilities: ['quota', 'sessions'],
    quota: [
      { id: 'primary', label: '5h', usedPercent: 25, resetAt: '2026-09-01T12:00:00.000Z' },
      { id: 'secondary', label: '7d', usedPercent: 40, resetAt: '2026-09-07T00:00:00.000Z' },
    ],
    quotaHistory: [],
    usage: [],
    sessions: [{ id: '42', provider: 'codex', project: 'cyboard-punk', status: 'active' }],
    freshness: 'fresh',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    provider: 'claude',
    displayName: 'Claude Code',
    capabilities: [],
    quota: [],
    quotaHistory: [],
    usage: [],
    sessions: [],
    freshness: 'unavailable',
    updatedAt: '2026-09-01T00:00:00.000Z',
    issue: { code: 'login-required', message: 'Claude Code is not signed in' },
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
});

afterEach(() => {
  cleanup();
  refresh.mockReset();
  localStorage.clear();
});

describe('App', () => {
  it('renders every quota window with remaining capacity as the primary value', async () => {
    render(() => <App />);
    expect(await screen.findByText('75%')).toBeTruthy();
    expect(screen.getByText('25% used')).toBeTruthy();
    expect(screen.getAllByText('60%').length).toBeGreaterThan(0);
    expect(screen.getByText('40% used')).toBeTruthy();
    expect(screen.getByText('5h')).toBeTruthy();
    expect(screen.getByText('7d')).toBeTruthy();
    expect(screen.getByText('Claude Code is not signed in')).toBeTruthy();
    expect(screen.getByText('cyboard-punk')).toBeTruthy();
    expect(screen.getByText('1/3 PROVIDERS READY')).toBeTruthy();
    expect(screen.getByText('LIVE')).toBeTruthy();
    expect(screen.getAllByText('OFFLINE').length).toBeGreaterThan(0);
    expect(screen.queryByRole('group', { name: 'Simulated NYX state' })).toBeNull();
  });

  it('shows the NYX simulator only after the persisted test-controls opt-in and overrides operator state', async () => {
    localStorage.setItem(
      'cyboard.settings.v1',
      JSON.stringify({ operatorMode: 'female', operatorTestControlsEnabled: true }),
    );
    render(() => <App />);

    await screen.findByRole('heading', { name: 'Codex' });
    expect(screen.getByRole('group', { name: 'Simulated NYX state' })).toBeTruthy();
    expect(await screen.findByLabelText('NYX CYBOARD operator, processing')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'WARNING' }));
    expect(await screen.findByLabelText('NYX CYBOARD operator, warning')).toBeTruthy();
  });

  it('hides disabled providers and updates the ready denominator', async () => {
    localStorage.setItem(
      'cyboard.settings.v1',
      JSON.stringify({
        enabledProviders: ['codex'],
        operatorMode: 'off',
      }),
    );
    render(() => <App />);
    expect(await screen.findByRole('heading', { name: 'Codex' })).toBeTruthy();
    expect(screen.queryByText('Claude Code')).toBeNull();
    expect(screen.getByText('1/1 PROVIDERS READY')).toBeTruthy();
  });

  it('loads providers through a refresh instead of showing an empty initial cache', async () => {
    render(() => <App />);
    await screen.findByRole('heading', { name: 'Codex' });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
