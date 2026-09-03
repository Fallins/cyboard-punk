import type { Freshness, ProviderIssueCode } from '../domain/types';

export type AppLanguage = 'en' | 'zh-TW';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'zh-TW';
}

export function formatDurationCompact(minutes: number, language: AppLanguage = 'en'): string {
  const safe = Math.max(0, Math.round(Number.isFinite(minutes) ? minutes : 0));
  const units = language === 'zh-TW'
    ? { minute: 'M', hour: 'H', day: 'D' }
    : { minute: 'm', hour: 'h', day: 'd' };
  if (safe < 60) return `${safe}${units.minute}`;
  const hours = Math.floor(safe / 60);
  const remainderMinutes = safe % 60;
  if (hours < 24) {
    return remainderMinutes > 0
      ? `${hours}${units.hour} ${remainderMinutes}${units.minute}`
      : `${hours}${units.hour}`;
  }
  const days = Math.floor(hours / 24);
  const remainderHours = hours % 24;
  return remainderHours > 0
    ? `${days}${units.day} ${remainderHours}${units.hour}`
    : `${days}${units.day}`;
}

export function formatQuotaWindowLabel(label: string, language: AppLanguage): string {
  if (language !== 'zh-TW') return label;
  return label.replace(/^(\d+)\s*([dhm])$/i, (_match, value: string, unit: string) => `${value}${unit.toUpperCase()}`);
}

export function formatDateTime(value: string | Date, language: AppLanguage): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  if (language === 'en') return date.toLocaleString();
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function freshnessText(freshness: Freshness, language: AppLanguage): string {
  if (language === 'en') return freshness;
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
