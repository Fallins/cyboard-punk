import type { ProviderSnapshot } from './types';

export type ProviderEvidence = 'CACHE' | 'LIVE' | 'OFFLINE';

export function providerEvidence(snapshot: ProviderSnapshot): ProviderEvidence {
  if (snapshot.source?.kind === 'unavailable') return 'OFFLINE';
  if (snapshot.source?.kind === 'local-cache') return 'CACHE';
  if (snapshot.freshness === 'stale' || snapshot.issue?.code === 'stale-cache') return 'CACHE';
  if (snapshot.freshness === 'unavailable' || snapshot.quota.length === 0) return 'OFFLINE';
  return 'LIVE';
}
