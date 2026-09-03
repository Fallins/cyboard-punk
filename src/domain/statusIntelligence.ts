import { rankProvidersByQuotaHeadroom } from './capacityRouting';
import { forecastQuota } from './forecast';
import { mostConstrainedQuota, quotaRemainingPercent } from './quota';
import type { ProviderId, ProviderSnapshot, QuotaWindow } from './types';
import {
  formatDurationCompact,
  formatQuotaWindowLabel,
  providerIssueText,
  type AppLanguage,
} from '../i18n/core';

export type IntelligenceTone = 'nominal' | 'advisory' | 'warning' | 'offline';

export type IntelligenceSignalKind =
  | 'depletion-risk'
  | 'low-capacity'
  | 'provider-state'
  | 'active-sessions'
  | 'recent-project';

export interface IntelligenceSignal {
  kind: IntelligenceSignalKind;
  tone: Exclude<IntelligenceTone, 'offline'> | 'offline';
  label: string;
  detail: string;
  provider?: ProviderId;
  remainingPercent?: number;
}

export interface IntelligenceReset {
  provider: ProviderId;
  displayName: string;
  windowLabel: string;
  resetAt: string;
  minutesUntil: number;
}

export interface RecentProjectSignal {
  project: string;
  tokens: number;
  sharePercent: number;
}

export interface StatusIntelligence {
  tone: IntelligenceTone;
  headline: string;
  summary: string;
  recommendedProvider?: ProviderId;
  activeSessions: number;
  nearestReset?: IntelligenceReset;
  recentProject?: RecentProjectSignal;
  signals: IntelligenceSignal[];
}

const RECENT_ACTIVITY_MS = 24 * 60 * 60 * 1000;
const WARNING_REMAINING_PERCENT = 10;
const ADVISORY_REMAINING_PERCENT = 25;
const MAX_SIGNALS = 5;

function historyFor(snapshot: ProviderSnapshot, window: QuotaWindow) {
  return snapshot.quotaHistory.filter((sample) => sample.windowId === window.id);
}

function minutesUntil(resetAt: string, now: Date): number | undefined {
  const resetMs = new Date(resetAt).getTime();
  if (!Number.isFinite(resetMs) || resetMs <= now.getTime()) return undefined;
  return Math.max(1, Math.ceil((resetMs - now.getTime()) / 60_000));
}

function nearestReset(
  snapshots: ProviderSnapshot[],
  now: Date,
  language: AppLanguage,
): IntelligenceReset | undefined {
  const candidates = snapshots.flatMap((snapshot) => {
    if (snapshot.freshness === 'unavailable') return [];
    return snapshot.quota.flatMap((window) => {
      if (!window.resetAt) return [];
      const minutes = minutesUntil(window.resetAt, now);
      if (minutes === undefined) return [];
      return [{
        provider: snapshot.provider,
        displayName: snapshot.displayName,
        windowLabel: formatQuotaWindowLabel(window.label, language),
        resetAt: window.resetAt,
        minutesUntil: minutes,
      } satisfies IntelligenceReset];
    });
  });

  candidates.sort((left, right) => left.minutesUntil - right.minutesUntil || left.provider.localeCompare(right.provider));
  return candidates[0];
}

function recentRequestProject(snapshots: ProviderSnapshot[], now: Date): RecentProjectSignal | undefined {
  const cutoff = now.getTime() - RECENT_ACTIVITY_MS;
  const byProject = new Map<string, number>();
  let attributedTokens = 0;

  for (const snapshot of snapshots) {
    for (const sample of snapshot.usage) {
      if (sample.scope !== 'request' || !sample.project || !Number.isFinite(sample.tokens) || (sample.tokens ?? 0) <= 0) continue;
      const sampleTime = new Date(sample.at).getTime();
      if (!Number.isFinite(sampleTime) || sampleTime < cutoff || sampleTime > now.getTime()) continue;
      const tokens = sample.tokens ?? 0;
      attributedTokens += tokens;
      byProject.set(sample.project, (byProject.get(sample.project) ?? 0) + tokens);
    }
  }

  const top = [...byProject.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
  if (!top || attributedTokens <= 0) return undefined;
  return { project: top[0], tokens: top[1], sharePercent: Math.round((top[1] / attributedTokens) * 100) };
}

function signalPriority(signal: IntelligenceSignal): number {
  if (signal.kind === 'depletion-risk') return 0;
  if (signal.kind === 'low-capacity' && signal.tone === 'warning') return 1;
  if (signal.kind === 'provider-state') return 2;
  if (signal.kind === 'low-capacity') return 3;
  if (signal.kind === 'active-sessions') return 4;
  return 5;
}

function activeSessionCount(snapshots: ProviderSnapshot[]): number {
  return snapshots.reduce((total, snapshot) => total + snapshot.sessions.filter((session) => session.status === 'active').length, 0);
}

export function buildStatusIntelligence(
  snapshots: ProviderSnapshot[],
  now = new Date(),
  language: AppLanguage = 'en',
): StatusIntelligence {
  const isZh = language === 'zh-TW';
  const route = rankProvidersByQuotaHeadroom(snapshots);
  const activeSessions = activeSessionCount(snapshots);
  const reset = nearestReset(snapshots, now, language);
  const recentProject = recentRequestProject(snapshots, now);
  const signals: IntelligenceSignal[] = [];
  const depletionProviders = new Set<ProviderId>();
  let hasCriticalCapacity = false;
  let hasAdvisoryCapacity = false;
  let hasProviderDegradation = false;

  for (const snapshot of snapshots) {
    if (snapshot.freshness !== 'fresh') {
      hasProviderDegradation = true;
      signals.push({
        kind: 'provider-state',
        tone: snapshot.freshness === 'unavailable' ? 'offline' : 'advisory',
        provider: snapshot.provider,
        label: isZh
          ? `${snapshot.displayName} ${snapshot.freshness === 'unavailable' ? '離線' : '使用快取'}`
          : `${snapshot.displayName} ${snapshot.freshness === 'unavailable' ? 'offline' : 'using stale evidence'}`,
        detail: snapshot.issue
          ? providerIssueText(snapshot.issue.code, snapshot.issue.message, language)
          : isZh ? '目前沒有可用的 Provider 資料。' : 'Current provider evidence is unavailable.',
      });
      continue;
    }

    const constrained = mostConstrainedQuota(snapshot);
    if (!constrained) continue;
    const constrainedLabel = formatQuotaWindowLabel(constrained.label, language);
    const remainingPercent = Math.round(quotaRemainingPercent(constrained));
    const forecast = forecastQuota(constrained, historyFor(snapshot, constrained), now);

    if (forecast.willDepleteBeforeReset && forecast.projectedDepletionAt) {
      depletionProviders.add(snapshot.provider);
      hasCriticalCapacity = true;
      signals.push({
        kind: 'depletion-risk', tone: 'warning', provider: snapshot.provider, remainingPercent,
        label: isZh ? `${snapshot.displayName} 可能在重置前用完` : `${snapshot.displayName} may deplete before reset`,
        detail: isZh ? `${constrainedLabel} 剩 ${remainingPercent}% · 依目前速度。` : `${constrainedLabel} has ${remainingPercent}% left at the current measured burn rate.`,
      });
      continue;
    }

    if (remainingPercent <= WARNING_REMAINING_PERCENT) {
      hasCriticalCapacity = true;
      signals.push({
        kind: 'low-capacity', tone: 'warning', provider: snapshot.provider, remainingPercent,
        label: isZh ? `${snapshot.displayName} 額度偏低` : `${snapshot.displayName} capacity critical`,
        detail: isZh ? `${constrainedLabel} 剩 ${remainingPercent}%。` : `${constrainedLabel} has ${remainingPercent}% left.`,
      });
    } else if (remainingPercent <= ADVISORY_REMAINING_PERCENT) {
      hasAdvisoryCapacity = true;
      signals.push({
        kind: 'low-capacity', tone: 'advisory', provider: snapshot.provider, remainingPercent,
        label: isZh ? `${snapshot.displayName} 額度開始吃緊` : `${snapshot.displayName} capacity getting tight`,
        detail: isZh ? `${constrainedLabel} 剩 ${remainingPercent}%。` : `${constrainedLabel} has ${remainingPercent}% left.`,
      });
    }
  }

  if (activeSessions > 0) {
    signals.push({
      kind: 'active-sessions', tone: 'nominal',
      label: isZh ? `${activeSessions} 個 Session 執行中` : `${activeSessions} active ${activeSessions === 1 ? 'session' : 'sessions'}`,
      detail: isZh ? '目前偵測到即時 Agent 活動。' : 'Live agent activity is currently detected.',
    });
  }

  if (recentProject) {
    signals.push({
      kind: 'recent-project', tone: 'nominal',
      label: isZh ? `近期 Request 以 ${recentProject.project} 為主` : `Recent request activity led by ${recentProject.project}`,
      detail: isZh ? `近 24H 可歸屬 Project 的 Token 中占 ${recentProject.sharePercent}%。` : `${recentProject.sharePercent}% of project-attributed request tokens in the last 24 hours.`,
    });
  }

  signals.sort((left, right) => signalPriority(left) - signalPriority(right) || left.label.localeCompare(right.label));

  const criticalSnapshot = snapshots.find((snapshot) => {
    if (snapshot.freshness !== 'fresh') return false;
    const constrained = mostConstrainedQuota(snapshot);
    return constrained ? quotaRemainingPercent(constrained) <= WARNING_REMAINING_PERCENT : false;
  });
  const depletionSnapshot = snapshots.find((snapshot) => depletionProviders.has(snapshot.provider));
  const advisorySnapshot = snapshots.find((snapshot) => {
    if (snapshot.freshness !== 'fresh') return false;
    const constrained = mostConstrainedQuota(snapshot);
    if (!constrained) return false;
    const remaining = quotaRemainingPercent(constrained);
    return remaining > WARNING_REMAINING_PERCENT && remaining <= ADVISORY_REMAINING_PERCENT;
  });

  let tone: IntelligenceTone = 'nominal';
  let headline = isZh ? '目前 Provider 額度穩定' : 'Capacity is stable across monitored providers';

  if (!route.recommended) {
    tone = 'offline';
    headline = isZh ? '目前沒有可用的最新額度' : 'No provider has a current quota signal';
  } else if (depletionSnapshot) {
    tone = 'warning';
    headline = isZh ? `${depletionSnapshot.displayName} 可能在重置前用完` : `${depletionSnapshot.displayName} may deplete before reset`;
  } else if (criticalSnapshot) {
    tone = 'warning';
    headline = isZh ? `${criticalSnapshot.displayName} 額度偏低` : `${criticalSnapshot.displayName} capacity is critical`;
  } else if (advisorySnapshot) {
    tone = 'advisory';
    headline = isZh ? `${advisorySnapshot.displayName} 額度開始吃緊` : `${advisorySnapshot.displayName} capacity is getting tight`;
  } else if (hasProviderDegradation) {
    tone = 'advisory';
    headline = isZh ? `目前建議使用 ${route.recommended.displayName}` : `${route.recommended.displayName} is the safest current route`;
  } else if (route.candidates.length > 1) {
    headline = isZh ? `${route.recommended.displayName} 額度餘裕最多` : `${route.recommended.displayName} has the most available headroom`;
  } else {
    headline = isZh ? `${route.recommended.displayName} 額度可用` : `${route.recommended.displayName} capacity is available`;
  }

  if (hasCriticalCapacity) tone = 'warning';
  else if (tone !== 'offline' && (hasAdvisoryCapacity || hasProviderDegradation)) tone = 'advisory';

  const summaryParts: string[] = [];
  if (route.recommended) {
    const routeWindowLabel = formatQuotaWindowLabel(route.recommended.constrainedWindowLabel, language);
    summaryParts.push(isZh
      ? `${route.recommended.displayName} ${routeWindowLabel} 剩 ${Math.round(route.recommended.remainingPercent)}%。`
      : `${route.recommended.displayName}: ${Math.round(route.recommended.remainingPercent)}% left on ${routeWindowLabel}.`);
  } else {
    summaryParts.push(isZh ? '目前沒有可用於推薦的最新額度。' : 'No fresh quota window is available for routing.');
  }
  if (activeSessions > 0) {
    summaryParts.push(isZh ? `${activeSessions} 個 Session 執行中。` : `${activeSessions} active ${activeSessions === 1 ? 'session' : 'sessions'}.`);
  }
  if (reset) {
    summaryParts.push(isZh
      ? `${reset.displayName} ${reset.windowLabel} ${formatDurationCompact(reset.minutesUntil, language)} 後重置。`
      : `${reset.displayName} ${reset.windowLabel} resets in ${formatDurationCompact(reset.minutesUntil, language)}.`);
  }

  return {
    tone,
    headline,
    summary: summaryParts.join(' '),
    recommendedProvider: route.recommended?.provider,
    activeSessions,
    nearestReset: reset,
    recentProject,
    signals: signals.slice(0, MAX_SIGNALS),
  };
}
