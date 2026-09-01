import { invoke } from '@tauri-apps/api/core';
import type { ProviderSnapshot } from '../domain/types';

export interface AntigravityAuthStatus {
  connected: boolean;
  email?: string;
  clientSource?: string;
  message?: string;
}

export interface ProviderClient {
  getSnapshots(): Promise<ProviderSnapshot[]>;
  refresh(provider?: ProviderSnapshot['provider'], force?: boolean): Promise<ProviderSnapshot[]>;
  antigravityAuthStatus(): Promise<AntigravityAuthStatus>;
  connectAntigravityGoogle(): Promise<AntigravityAuthStatus>;
  cancelAntigravityGoogle(): Promise<void>;
  disconnectAntigravityGoogle(): Promise<AntigravityAuthStatus>;
}

export class TauriProviderClient implements ProviderClient {
  async getSnapshots(): Promise<ProviderSnapshot[]> {
    return invoke<ProviderSnapshot[]>('get_provider_snapshots');
  }

  async refresh(provider?: ProviderSnapshot['provider'], force = false): Promise<ProviderSnapshot[]> {
    return invoke<ProviderSnapshot[]>('refresh_providers', { provider: provider ?? null, force });
  }

  async antigravityAuthStatus(): Promise<AntigravityAuthStatus> {
    return invoke<AntigravityAuthStatus>('antigravity_auth_status');
  }

  async connectAntigravityGoogle(): Promise<AntigravityAuthStatus> {
    return invoke<AntigravityAuthStatus>('connect_antigravity_google');
  }

  async cancelAntigravityGoogle(): Promise<void> {
    return invoke<void>('cancel_antigravity_google');
  }

  async disconnectAntigravityGoogle(): Promise<AntigravityAuthStatus> {
    return invoke<AntigravityAuthStatus>('disconnect_antigravity_google');
  }
}
