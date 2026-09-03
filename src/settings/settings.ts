import type { ProviderId } from '../domain/types';

export type OperatorMode = 'female' | 'male' | 'off';
export type NotificationPersonality = 'system' | 'nyx' | 'minimal';

export interface AppSettings {
  autoRefreshSeconds: number;
  notificationsEnabled: boolean;
  notificationThresholds: number[];
  resetNotificationMinutes: number;
  notificationPersonality: NotificationPersonality;
  launchAtLogin: boolean;
  enabledProviders: ProviderId[];
  operatorMode: OperatorMode;
  operatorTestControlsEnabled: boolean;
}

type PersistedSettings = Partial<AppSettings> & { operatorEnabled?: boolean };

export const allProviders: ProviderId[] = ['codex', 'claude', 'cursor'];

export const defaultSettings: AppSettings = {
  autoRefreshSeconds: 60,
  notificationsEnabled: true,
  notificationThresholds: [20, 10, 5],
  resetNotificationMinutes: 10,
  notificationPersonality: 'system',
  launchAtLogin: false,
  enabledProviders: [...allProviders],
  operatorMode: 'female',
  operatorTestControlsEnabled: false,
};

const storageKey = 'cyboard.settings.v1';
const allowedResetNotificationMinutes = [0, 5, 10, 30, 60];
const allowedNotificationPersonalities: NotificationPersonality[] = ['system', 'nyx', 'minimal'];

export function loadSettings(storage: Pick<Storage, 'getItem'> = localStorage): AppSettings {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return { ...defaultSettings, enabledProviders: [...defaultSettings.enabledProviders] };
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return { ...defaultSettings, enabledProviders: [...defaultSettings.enabledProviders] };
  }
}

export function saveSettings(settings: AppSettings, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(storageKey, JSON.stringify(sanitizeSettings(settings)));
}

export function sanitizeSettings(value: PersistedSettings | null | undefined): AppSettings {
  const thresholds = Array.isArray(value?.notificationThresholds)
    ? value.notificationThresholds.filter(
        (threshold) => Number.isFinite(threshold) && threshold > 0 && threshold < 100,
      )
    : defaultSettings.notificationThresholds;
  const requestedProviders = Array.isArray(value?.enabledProviders) ? value.enabledProviders : null;
  const enabledProviders = requestedProviders
    ? allProviders.filter((provider) => requestedProviders.includes(provider))
    : [...defaultSettings.enabledProviders];
  const legacyOperatorMode = value?.operatorEnabled === false ? 'off' : defaultSettings.operatorMode;
  const operatorMode: OperatorMode = ['female', 'male', 'off'].includes(value?.operatorMode ?? '')
    ? (value?.operatorMode as OperatorMode)
    : legacyOperatorMode;
  const resetNotificationMinutes = allowedResetNotificationMinutes.includes(value?.resetNotificationMinutes ?? -1)
    ? value!.resetNotificationMinutes!
    : defaultSettings.resetNotificationMinutes;
  const notificationPersonality = allowedNotificationPersonalities.includes(value?.notificationPersonality ?? 'system')
    ? (value?.notificationPersonality as NotificationPersonality)
    : defaultSettings.notificationPersonality;

  return {
    autoRefreshSeconds: clamp(value?.autoRefreshSeconds ?? defaultSettings.autoRefreshSeconds, 30, 900),
    notificationsEnabled: value?.notificationsEnabled ?? defaultSettings.notificationsEnabled,
    notificationThresholds: [...new Set(thresholds)].sort((a, b) => b - a).slice(0, 6),
    resetNotificationMinutes,
    notificationPersonality,
    launchAtLogin: value?.launchAtLogin ?? defaultSettings.launchAtLogin,
    enabledProviders,
    operatorMode,
    operatorTestControlsEnabled:
      value?.operatorTestControlsEnabled ?? defaultSettings.operatorTestControlsEnabled,
  };
}

export function isProviderEnabled(settings: AppSettings, provider: ProviderId) {
  return settings.enabledProviders.includes(provider);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
