import { cleanup, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProviderSnapshot } from '../domain/types';

const snapshots: ProviderSnapshot[] = [
  {
    provider: 'codex',
    displayName: 'Codex',
    capabilities: ['quota', 'sessions'],
    quota: [{ id: 'weekly', label: '7d', usedPercent: 25, resetAt: '2026-09-07T00:00:00.000Z' }],
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
    usage: [],
    sessions: [],
    freshness: 'unavailable',
    updatedAt: '2026-09-01T00:00:00.000Z',
    issue: { code: 'login-required', message: 'Claude Code is not signed in' },
  },
];

const refresh = vi.fn(async () => snapshots);
vi.mock('../providers/client', () => ({
  TauriProviderClient: class {
    refresh = refresh;
  },
}));

import App from './App';

afterEach(() => {
  cleanup();
  refresh.mockClear();
});

describe('App', () => {
  it('renders normalized provider status and active sessions', async () => {
    render(() => <App />);
    expect(await screen.findByText('75%')).toBeTruthy();
    expect(screen.getByText('Claude Code is not signed in')).toBeTruthy();
    expect(screen.getByText('cyboard-punk')).toBeTruthy();
    expect(screen.getByText('1/3 PROVIDERS ONLINE')).toBeTruthy();
  });

  it('loads providers through a refresh instead of showing an empty initial cache', async () => {
    render(() => <App />);
    await screen.findByText('Codex');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
