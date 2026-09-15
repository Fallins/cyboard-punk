import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
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
vi.mock('./NyxVrmRuntime', () => ({
  default: (props: {
    characterId: string;
    onCameraViewChange?: (view: {
      version: 1;
      position: [number, number, number];
      target: [number, number, number];
    }) => void;
  }) => {
    return (
      <div data-testid="nyx-vrm-runtime" data-character-id={props.characterId}>
        <button
          type="button"
          onClick={() =>
            props.onCameraViewChange?.({
              version: 1,
              position: [0.8, 1.7, 4.1],
              target: [0, 0.9, 0],
            })
          }>
          Simulate camera view
        </button>
      </div>
    );
  },
}));

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
    expect(screen.getAllByText('Claude Code is not signed in').length).toBeGreaterThan(0);
    expect(screen.getByText('cyboard-punk')).toBeTruthy();
    expect(screen.getByText('1/3 PROVIDERS READY')).toBeTruthy();
    expect(screen.getByText('LIVE')).toBeTruthy();
    expect(screen.getAllByText('OFFLINE').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'System Brief' })).toBeTruthy();
    expect(screen.getAllByText('Codex is the safest current route').length).toBeGreaterThan(0);
    expect(screen.queryByRole('group', { name: 'Simulated NYX state' })).toBeNull();
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

  it('publishes a recent closeout only after two fresh observations miss the prior active session', async () => {
    const withoutSession = snapshots.map((snapshot) =>
      snapshot.provider === 'codex' ? { ...snapshot, sessions: [] } : snapshot,
    );
    refresh.mockReset();
    refresh
      .mockResolvedValueOnce(snapshots)
      .mockResolvedValueOnce(withoutSession)
      .mockResolvedValueOnce(withoutSession);

    render(() => <App />);
    expect(await screen.findByText('cyboard-punk')).toBeTruthy();

    const refreshButton = screen.getByRole('button', { name: 'REFRESH' }) as HTMLButtonElement;
    await fireEvent.click(refreshButton);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Recent Closeouts')).toBeNull();

    await waitFor(() => expect(refreshButton.disabled).toBe(false));
    await fireEvent.click(refreshButton);
    expect(await screen.findByText('Recent Closeouts')).toBeTruthy();
    expect(screen.getByText('OBSERVED <1m')).toBeTruthy();
  });

  it('loads providers through a refresh instead of showing an empty initial cache', async () => {
    render(() => <App />);
    await screen.findByRole('heading', { name: 'Codex' });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('persists formal character action mapping without remounting the runtime', async () => {
    render(() => <App />);
    await screen.findByRole('heading', { name: 'Codex' });
    const runtime = screen.getByTestId('nyx-vrm-runtime');
    await fireEvent.click(screen.getByRole('button', { name: 'SETTINGS' }));
    await fireEvent.change(screen.getByRole('combobox', { name: 'Warning action' }), { target: { value: 'shoot' } });

    expect(screen.getByRole('button', { name: 'Open character workbench' })).toBeTruthy();
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('cyboard.settings.v1') ?? '{}').nyxEventMotions.warning).toBe('shoot');
    });
    expect(runtime).toBe(screen.getByTestId('nyx-vrm-runtime'));
    expect(runtime.getAttribute('data-character-id')).toBe('shion-vroid-2-14-v1');
  });

  it('persists the stage camera lock without remounting the NYX runtime', async () => {
    render(() => <App />);
    await screen.findByRole('heading', { name: 'Codex' });

    const runtime = screen.getByTestId('nyx-vrm-runtime');
    await fireEvent.click(screen.getByRole('button', { name: 'Lock character view' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Unlock character view' })).toBeTruthy());
    expect(runtime).toBe(screen.getByTestId('nyx-vrm-runtime'));
    expect(JSON.parse(localStorage.getItem('cyboard.settings.v1') ?? '{}').nyxStageInteractionLocked).toBe(true);
  });

  it('persists the main-stage camera view for the desktop character payload', async () => {
    render(() => <App />);
    await screen.findByRole('heading', { name: 'Codex' });

    await fireEvent.click(screen.getByRole('button', { name: 'Simulate camera view' }));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('cyboard.settings.v1') ?? '{}').nyxCameraView).toEqual({
        version: 1,
        position: [0.8, 1.7, 4.1],
        target: [0, 0.9, 0],
      });
    });
  });
});
