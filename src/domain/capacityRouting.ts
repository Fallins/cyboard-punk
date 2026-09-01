import { mostConstrainedQuota, quotaRemainingPercent } from './quota';
import type { ProviderId, ProviderSnapshot } from './types';

export interface CapacityRouteCandidate {
  provider: ProviderId;
  displayName: string;
  remainingPercent: number;
  constrainedWindowLabel: string;
}

export interface CapacityRouteRecommendation {
  recommended?: CapacityRouteCandidate;
  candidates: CapacityRouteCandidate[];
  excludedProviders: ProviderId[];
}

export function rankProvidersByQuotaHeadroom(
  snapshots: ProviderSnapshot[],
): CapacityRouteRecommendation {
  const candidates: CapacityRouteCandidate[] = [];
  const excludedProviders: ProviderId[] = [];

  for (const snapshot of snapshots) {
    if (snapshot.freshness !== 'fresh') {
      excludedProviders.push(snapshot.provider);
      continue;
    }

    const constrained = mostConstrainedQuota(snapshot);
    if (!constrained) {
      excludedProviders.push(snapshot.provider);
      continue;
    }

    candidates.push({
      provider: snapshot.provider,
      displayName: snapshot.displayName,
      remainingPercent: quotaRemainingPercent(constrained),
      constrainedWindowLabel: constrained.label,
    });
  }

  candidates.sort((left, right) => {
    if (left.remainingPercent !== right.remainingPercent) {
      return right.remainingPercent - left.remainingPercent;
    }
    return left.provider.localeCompare(right.provider);
  });

  return {
    recommended: candidates[0],
    candidates,
    excludedProviders,
  };
}
