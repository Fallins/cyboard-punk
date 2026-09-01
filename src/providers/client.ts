import { invoke } from '@tauri-apps/api/core';
import type { ProviderSnapshot } from '../domain/types';

export interface ProviderClient {
  getSnapshots(): Promise<ProviderSnapshot[]>;
  refresh(provider?: ProviderSnapshot['provider'], force?: boolean): Promise<ProviderSnapshot[]>;
}

export class TauriProviderClient implements ProviderClient {
  async getSnapshots(): Promise<ProviderSnapshot[]> {
    return invoke<ProviderSnapshot[]>('get_provider_snapshots');
  }

  async refresh(provider?: ProviderSnapshot['provider'], force = false): Promise<ProviderSnapshot[]> {
    return invoke<ProviderSnapshot[]>('refresh_providers', { provider: provider ?? null, force });
  }
}
