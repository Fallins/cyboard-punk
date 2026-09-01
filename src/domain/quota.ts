import type { ProviderSnapshot, QuotaWindow } from './types';

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function quotaRemainingPercent(window: QuotaWindow): number {
  return 100 - clampPercent(window.usedPercent);
}

export function mostConstrainedQuota(snapshot: Pick<ProviderSnapshot, 'quota'>): QuotaWindow | undefined {
  return snapshot.quota.reduce<QuotaWindow | undefined>(
    (current, candidate) =>
      current === undefined || clampPercent(candidate.usedPercent) > clampPercent(current.usedPercent)
        ? candidate
        : current,
    undefined,
  );
}

export function mostConstrainedRemaining(snapshot: Pick<ProviderSnapshot, 'quota'>): number | undefined {
  const window = mostConstrainedQuota(snapshot);
  return window ? quotaRemainingPercent(window) : undefined;
}
