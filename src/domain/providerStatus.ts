import type { ProviderSnapshot } from './types';

export function isProviderReady(snapshot: Pick<ProviderSnapshot, 'freshness' | 'quota'>) {
  return snapshot.freshness === 'fresh' && snapshot.quota.length > 0;
}
