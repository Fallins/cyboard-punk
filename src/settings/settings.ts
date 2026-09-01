import type { ProviderId } from '../domain/types';

export type OperatorMode = 'female' | 'male' | 'off';

export interface AppSettings {
  autoRefreshSeconds: number;
  notificationsEnabled: boolean;
  notificationThresholds: number[];
  launchAtLogin: boolean;
  enabledProviders: ProviderId[];
  operatorMode: OperatorMode;
}

export const allProviders: ProviderId[] = ['codex', 'claude', 'cursor', 'antigravity'];

export const defaultSettings: AppSettings = {
  autoRefreshSeconds: 60,
  notificationsEnabled: true,
  notificationThresholds: [20, 10, 5],
  launchAtLogin: false,
  enabledProviders: [...allProviders],
  operatorMode: 'female',
};

const storageKey = 'cyboard.settings.v1';

export function loadSettings(storage: Pick<Storage, 'getItem'> = localStorage): AppSettings {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return defaultSettings;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(storageKey, JSON.stringify(sanitizeSettings(settings)));
}

export function sanitizeSettings(value: Partial<AppSettings> & { operatorEnabled?: boolean } | null | undefined): AppSettings {
  const thresholds = Array.isArray(value?.notificationThresholds)
    ? value.notificationThresholds.filter((threshold) => Number.isFinite(threshold) && threshold > 0 && threshold < 100)
    : defaultSettings.notificationThresholds;
  const enabledProviders = Array.isArray(value?.enabledProviders)
    ? allProviders.filter((provider) => value.enabledProviders?.includes(provider))
    : [...defaultSettings.enabledProviders];
  const legacyOperatorMode = value?.operatorEnabled === false ? 'off' : defaultSettings.operatorMode;
  const operatorMode: OperatorMode = ['female', 'male', 'off'].includes(value?.operatorMode ?? '')
    ? (value?.operatorMode as OperatorMode)
    : legacyOperatorMode;

  return {
    autoRefreshSeconds: clamp(value?.autoRefreshSeconds ?? defaultSettings.autoRefreshSeconds, 30, 900),
    notificationsEnabled: value?.notificationsEnabled ?? defaultSettings.notificationsEnabled,
    notificationThresholds: [...new Set(thresholds)].sort((a, b) => b - a).slice(0, 6),
    launchAtLogin: value?.launchAtLogin ?? defaultSettings.launchAtLogin,
    enabledProviders,
    operatorMode,
  };
}

export function isProviderEnabled(settings: AppSettings, provider: ProviderId) {
  return settings.enabledProviders.includes(provider);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
