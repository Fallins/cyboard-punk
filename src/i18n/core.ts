import type { Freshness, ProviderIssueCode } from '../domain/types';

export type AppLanguage = 'en' | 'zh-TW';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'zh-TW';
}

export function formatDurationCompact(minutes: number): string {
  const safe = Math.max(0, Math.round(Number.isFinite(minutes) ? minutes : 0));
  if (safe < 60) return `${safe}M`;
  const hours = Math.floor(safe / 60);
  const remainderMinutes = safe % 60;
  if (hours < 24) return remainderMinutes > 0 ? `${hours}H ${remainderMinutes}M` : `${hours}H`;
  const days = Math.floor(hours / 24);
  const remainderHours = hours % 24;
  return remainderHours > 0 ? `${days}D ${remainderHours}H` : `${days}D`;
}

export function formatDateTime(value: string | Date, language: AppLanguage): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'zh-TW' ? 'zh-TW' : 'en-US', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: language !== 'zh-TW',
  }).format(date);
}

export function freshnessText(freshness: Freshness, language: AppLanguage): string {
  if (language === 'en') return freshness.toUpperCase();
  switch (freshness) {
    case 'fresh': return '即時';
    case 'stale': return '快取';
    case 'unavailable': return '離線';
  }
}

export function providerIssueText(code: ProviderIssueCode, fallback: string, language: AppLanguage): string {
  if (language === 'en') return fallback;
  switch (code) {
    case 'not-installed': return '尚未安裝 Provider。';
    case 'login-required': return '需要登入 Provider。';
    case 'rate-limited': return '暫時受限，稍後重試。';
    case 'network': return '目前無法連線。';
    case 'schema-changed': return 'Provider 資料格式已變更。';
    case 'stale-cache': return '目前使用最近一次快取。';
    case 'unknown': return 'Provider 目前不可用。';
  }
}
