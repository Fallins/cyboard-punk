import type { ProviderSnapshot } from '../domain/types';

export interface QuotaAlert {
  key: string;
  provider: ProviderSnapshot['provider'];
  threshold: number;
  remainingPercent: number;
  title: string;
  body: string;
}

export function quotaAlerts(
  snapshots: ProviderSnapshot[],
  thresholds: number[],
  alreadyNotified: ReadonlySet<string> = new Set(),
): QuotaAlert[] {
  const sorted = [...new Set(thresholds)].sort((a, b) => a - b);
  return snapshots.flatMap((snapshot) => {
    const primary = snapshot.quota[0];
    if (!primary) return [];
    const remainingPercent = Math.max(0, Math.min(100, 100 - primary.usedPercent));
    const threshold = sorted.find((candidate) => remainingPercent <= candidate);
    if (threshold === undefined) return [];
    const resetKey = primary.resetAt ?? 'unknown-reset';
    const key = `${snapshot.provider}:${primary.id}:${resetKey}:${threshold}`;
    if (alreadyNotified.has(key)) return [];
    return [
      {
        key,
        provider: snapshot.provider,
        threshold,
        remainingPercent,
        title: `${snapshot.displayName} capacity warning`,
        body: `${remainingPercent.toFixed(0)}% remaining${primary.resetAt ? ` · resets ${new Date(primary.resetAt).toLocaleString()}` : ''}`,
      },
    ];
  });
}
