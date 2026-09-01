import type { ProviderSnapshot } from './types';

export type ProviderEvidence = 'LOCAL' | 'CLOUD' | 'CACHE' | 'LIVE' | 'LIMITED' | 'OFFLINE';

export function providerEvidence(snapshot: ProviderSnapshot): ProviderEvidence {
  if (snapshot.issue?.code === 'cloud-not-permitted') return 'LIMITED';
  if (snapshot.freshness === 'stale' || snapshot.issue?.code === 'stale-cache') return 'CACHE';
  if (snapshot.freshness === 'unavailable' || snapshot.quota.length === 0) return 'OFFLINE';
  if (snapshot.provider === 'antigravity') {
    return snapshot.quota.some((window) => /cloud/i.test(window.label)) ? 'CLOUD' : 'LOCAL';
  }
  return 'LIVE';
}
