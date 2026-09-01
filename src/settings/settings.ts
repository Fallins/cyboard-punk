export interface AppSettings {
  autoRefreshSeconds: number;
  notificationsEnabled: boolean;
  notificationThresholds: number[];
  launchAtLogin: boolean;
  operatorEnabled: boolean;
}

export const defaultSettings: AppSettings = {
  autoRefreshSeconds: 60,
  notificationsEnabled: true,
  notificationThresholds: [20, 10, 5],
  launchAtLogin: false,
  operatorEnabled: true,
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

export function sanitizeSettings(value: Partial<AppSettings> | null | undefined): AppSettings {
  const thresholds = Array.isArray(value?.notificationThresholds)
    ? value.notificationThresholds.filter((threshold) => Number.isFinite(threshold) && threshold > 0 && threshold < 100)
    : defaultSettings.notificationThresholds;
  return {
    autoRefreshSeconds: clamp(value?.autoRefreshSeconds ?? defaultSettings.autoRefreshSeconds, 30, 900),
    notificationsEnabled: value?.notificationsEnabled ?? defaultSettings.notificationsEnabled,
    notificationThresholds: [...new Set(thresholds)].sort((a, b) => b - a).slice(0, 6),
    launchAtLogin: value?.launchAtLogin ?? defaultSettings.launchAtLogin,
    operatorEnabled: value?.operatorEnabled ?? defaultSettings.operatorEnabled,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
