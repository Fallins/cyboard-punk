import { mostConstrainedQuota, quotaRemainingPercent } from '../domain/quota';
import type { ProviderSnapshot } from '../domain/types';

export interface QuotaAlert {
  key: string;
  provider: ProviderSnapshot['provider'];
  threshold: number;
  remainingPercent: number;
  title: string;
  body: string;
}

export interface ResetAlert {
  key: string;
  provider: ProviderSnapshot['provider'];
  resetAt: string;
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
    const constrained = mostConstrainedQuota(snapshot);
    if (!constrained) return [];
    const remainingPercent = quotaRemainingPercent(constrained);
    const threshold = sorted.find((candidate) => remainingPercent <= candidate);
    if (threshold === undefined) return [];
    const resetKey = constrained.resetAt ?? 'unknown-reset';
    const key = `${snapshot.provider}:${constrained.id}:${resetKey}:${threshold}`;
    if (alreadyNotified.has(key)) return [];
    return [
      {
        key,
        provider: snapshot.provider,
        threshold,
        remainingPercent,
        title: `${snapshot.displayName} capacity warning`,
        body: `${constrained.label}: ${remainingPercent.toFixed(0)}% remaining${constrained.resetAt ? ` · resets ${new Date(constrained.resetAt).toLocaleString()}` : ''}`,
      },
    ];
  });
}

export function resetAlerts(
  snapshots: ProviderSnapshot[],
  leadMinutes: number,
  alreadyNotified: ReadonlySet<string> = new Set(),
  now = new Date(),
): ResetAlert[] {
  if (!Number.isFinite(leadMinutes) || leadMinutes <= 0) return [];
  const leadMs = leadMinutes * 60_000;
  const nowMs = now.getTime();
  const groups = new Map<string, { snapshot: ProviderSnapshot; resetAt: string; labels: string[]; remainingMs: number }>();

  for (const snapshot of snapshots) {
    for (const window of snapshot.quota) {
      if (!window.resetAt) continue;
      const resetMs = new Date(window.resetAt).getTime();
      if (!Number.isFinite(resetMs)) continue;
      const remainingMs = resetMs - nowMs;
      if (remainingMs <= 0 || remainingMs > leadMs) continue;

      const groupKey = `${snapshot.provider}:${window.resetAt}`;
      const existing = groups.get(groupKey);
      if (existing) {
        if (!existing.labels.includes(window.label)) existing.labels.push(window.label);
      } else {
        groups.set(groupKey, {
          snapshot,
          resetAt: window.resetAt,
          labels: [window.label],
          remainingMs,
        });
      }
    }
  }

  return [...groups.values()].flatMap(({ snapshot, resetAt, labels, remainingMs }) => {
    const key = `${snapshot.provider}:${resetAt}:reset`;
    if (alreadyNotified.has(key)) return [];
    const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
    const lanes = labels.join(' / ');
    return [
      {
        key,
        provider: snapshot.provider,
        resetAt,
        title: `${snapshot.displayName} quota reset soon`,
        body: `${lanes} ${labels.length === 1 ? 'resets' : 'reset'} in about ${minutes} min · ${new Date(resetAt).toLocaleString()}`,
      },
    ];
  });
}
