import { cleanup, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProviderSnapshot } from '../domain/types';

const data: ProviderSnapshot[] = [
  {
    provider: 'codex',
    displayName: 'Codex',
    capabilities: ['quota'],
    quota: [{ id: 'weekly', label: '7d', usedPercent: 25 }],
    quotaHistory: [],
    usage: [],
    sessions: [{ id: '1', provider: 'codex', status: 'active', project: 'cyboard-punk' }],
    freshness: 'fresh',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const refresh = vi.fn(async () => data);
vi.mock('../providers/client', () => ({ TauriProviderClient: class { refresh = refresh; } }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({ WebviewWindow: { getByLabel: vi.fn() } }));

import CompactApp from './CompactApp';

afterEach(() => {
  cleanup();
  refresh.mockClear();
  localStorage.clear();
});

describe('CompactApp', () => {
  it('shows quota and active session count in the menu surface', async () => {
    render(() => <CompactApp />);
    expect(await screen.findByText('75%')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('session running')).toBeTruthy();
  });
});
