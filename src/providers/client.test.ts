import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke }));

import { TauriProviderClient } from './client';

describe('TauriProviderClient', () => {
  beforeEach(() => invoke.mockReset());

  it('reads normalized snapshots through the native bridge', async () => {
    invoke.mockResolvedValueOnce([]);
    await expect(new TauriProviderClient().getSnapshots()).resolves.toEqual([]);
    expect(invoke).toHaveBeenCalledWith('get_provider_snapshots');
  });

  it('refreshes one provider explicitly', async () => {
    invoke.mockResolvedValueOnce([]);
    await new TauriProviderClient().refresh('codex');
    expect(invoke).toHaveBeenCalledWith('refresh_providers', { provider: 'codex', force: false });
  });

  it('refreshes every provider with a null selector', async () => {
    invoke.mockResolvedValueOnce([]);
    await new TauriProviderClient().refresh();
    expect(invoke).toHaveBeenCalledWith('refresh_providers', { provider: null, force: false });
  });

  it('marks manual refreshes as forced', async () => {
    invoke.mockResolvedValueOnce([]);
    await new TauriProviderClient().refresh(undefined, true);
    expect(invoke).toHaveBeenCalledWith('refresh_providers', { provider: null, force: true });
  });
});
