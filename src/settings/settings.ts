import type { ProviderId } from '../domain/types';
import {
  experimentalVrmCharacterFor,
  experimentalVrmOutfitFor,
  isNyxRuntimeMotionId,
  NYX_VROID_CHARACTER,
  NYX_RANDOM_ACTION_INTERVALS,
  NYX_REST_MOTION_ID,
  NYX_RUNTIME_EVENTS,
  type NyxRandomActionInterval,
  type NyxRuntimeEvent,
  type NyxRuntimeMotionId,
} from '../experiments/nyxVroidExperiment';
import { isAppLanguage, type AppLanguage } from '../i18n/core';

export type OperatorMode = 'female' | 'off';
export type NotificationPersonality = 'system' | 'nyx' | 'minimal';
export type NyxEventMotionMap = Record<NyxRuntimeEvent, NyxRuntimeMotionId>;

export interface AppSettings {
  language: AppLanguage;
  autoRefreshSeconds: number;
  notificationsEnabled: boolean;
  notificationThresholds: number[];
  resetNotificationMinutes: number;
  notificationPersonality: NotificationPersonality;
  launchAtLogin: boolean;
  enabledProviders: ProviderId[];
  operatorMode: OperatorMode;
  nyxEventMotions: NyxEventMotionMap;
  nyxRandomActionsEnabled: boolean;
  nyxRandomActionIntervalSeconds: NyxRandomActionInterval;
  nyxCharacterScale: number;
  nyxStageInteractionLocked: boolean;
  nyxCharacterId: string;
  nyxOutfitId: string;
}

type PersistedSettings = Omit<Partial<AppSettings>, 'operatorMode' | 'nyxEventMotions' | 'nyxRandomActionIntervalSeconds' | 'nyxCharacterScale'> & {
  operatorEnabled?: boolean;
  operatorMode?: unknown;
  nyxEventMotions?: Partial<Record<NyxRuntimeEvent, unknown>>;
  nyxRandomActionIntervalSeconds?: unknown;
  nyxCharacterScale?: unknown;
};

export const allProviders: ProviderId[] = ['codex', 'claude', 'cursor'];

const defaultNyxEventMotions = (): NyxEventMotionMap => ({
  idle: NYX_REST_MOTION_ID,
  observing: NYX_REST_MOTION_ID,
  processing: NYX_REST_MOTION_ID,
  warning: NYX_REST_MOTION_ID,
  success: NYX_REST_MOTION_ID,
  offline: NYX_REST_MOTION_ID,
});

const MIN_NYX_CHARACTER_SCALE = 0.75;
const MAX_NYX_CHARACTER_SCALE = 1.35;

export const defaultSettings: AppSettings = {
  language: 'en',
  autoRefreshSeconds: 60,
  notificationsEnabled: true,
  notificationThresholds: [20, 10, 5],
  resetNotificationMinutes: 10,
  notificationPersonality: 'system',
  launchAtLogin: false,
  enabledProviders: [...allProviders],
  operatorMode: 'female',
  nyxEventMotions: defaultNyxEventMotions(),
  nyxRandomActionsEnabled: false,
  nyxRandomActionIntervalSeconds: 60,
  nyxCharacterScale: 1,
  nyxStageInteractionLocked: false,
  nyxCharacterId: NYX_VROID_CHARACTER.id,
  nyxOutfitId: NYX_VROID_CHARACTER.defaultOutfitId,
};

export const APP_SETTINGS_STORAGE_KEY = 'cyboard.settings.v1';
const allowedResetNotificationMinutes = [0, 5, 10, 30, 60];
const allowedNotificationPersonalities: NotificationPersonality[] = ['system', 'nyx', 'minimal'];

export function loadSettings(storage: Pick<Storage, 'getItem'> = localStorage): AppSettings {
  try {
    const raw = storage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return freshDefaultSettings();
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return freshDefaultSettings();
  }
}

export function saveSettings(settings: AppSettings, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(sanitizeSettings(settings)));
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
  const requestedOperatorMode = value?.operatorMode;
  const operatorMode: OperatorMode = requestedOperatorMode === 'female' || requestedOperatorMode === 'off'
    ? requestedOperatorMode
    : requestedOperatorMode === 'male' ? 'female' : legacyOperatorMode;
  const resetNotificationMinutes = allowedResetNotificationMinutes.includes(value?.resetNotificationMinutes ?? -1)
    ? value!.resetNotificationMinutes!
    : defaultSettings.resetNotificationMinutes;
  const requestedNotificationPersonality = value?.notificationPersonality ?? defaultSettings.notificationPersonality;
  const notificationPersonality: NotificationPersonality = allowedNotificationPersonalities.includes(requestedNotificationPersonality)
    ? requestedNotificationPersonality
    : defaultSettings.notificationPersonality;
  const requestedLanguage = value?.language;
  const language = isAppLanguage(requestedLanguage) ? requestedLanguage : defaultSettings.language;
  const nyxEventMotions = sanitizeNyxEventMotions(value?.nyxEventMotions);
  const nyxRandomActionIntervalSeconds = sanitizeNyxRandomActionInterval(value?.nyxRandomActionIntervalSeconds);
  const nyxCharacterScale = clamp(
    typeof value?.nyxCharacterScale === 'number' ? value.nyxCharacterScale : defaultSettings.nyxCharacterScale,
    MIN_NYX_CHARACTER_SCALE,
    MAX_NYX_CHARACTER_SCALE,
  );
  const nyxStageInteractionLocked = value?.nyxStageInteractionLocked === true;
  const character = experimentalVrmCharacterFor(
    typeof value?.nyxCharacterId === 'string' ? value.nyxCharacterId : null,
  );
  const nyxCharacterId = character.id;
  const nyxOutfitId = experimentalVrmOutfitFor(
    character,
    typeof value?.nyxOutfitId === 'string' ? value.nyxOutfitId : null,
  ).id;

  return {
    language,
    autoRefreshSeconds: clamp(value?.autoRefreshSeconds ?? defaultSettings.autoRefreshSeconds, 30, 900),
    notificationsEnabled: value?.notificationsEnabled ?? defaultSettings.notificationsEnabled,
    notificationThresholds: [...new Set(thresholds)].sort((a, b) => b - a).slice(0, 6),
    resetNotificationMinutes,
    notificationPersonality,
    launchAtLogin: value?.launchAtLogin ?? defaultSettings.launchAtLogin,
    enabledProviders,
    operatorMode,
    nyxEventMotions,
    nyxRandomActionsEnabled: value?.nyxRandomActionsEnabled === true,
    nyxRandomActionIntervalSeconds,
    nyxCharacterScale,
    nyxStageInteractionLocked,
    nyxCharacterId,
    nyxOutfitId,
  };
}

export function isProviderEnabled(settings: AppSettings, provider: ProviderId) {
  return settings.enabledProviders.includes(provider);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function freshDefaultSettings(): AppSettings {
  return {
    ...defaultSettings,
    enabledProviders: [...defaultSettings.enabledProviders],
    nyxEventMotions: defaultNyxEventMotions(),
  };
}

function sanitizeNyxEventMotions(value: PersistedSettings['nyxEventMotions']): NyxEventMotionMap {
  const requested = value && typeof value === 'object' ? value : {};
  const defaults = defaultNyxEventMotions();
  return Object.fromEntries(
    NYX_RUNTIME_EVENTS.map((event) => {
      const motion = requested[event];
      return [event, isNyxRuntimeMotionId(motion) ? motion : defaults[event]];
    }),
  ) as NyxEventMotionMap;
}

function sanitizeNyxRandomActionInterval(value: unknown): NyxRandomActionInterval {
  if (typeof value !== 'number' || !Number.isFinite(value)) return defaultSettings.nyxRandomActionIntervalSeconds;
  const bounded = clamp(value, NYX_RANDOM_ACTION_INTERVALS[0], NYX_RANDOM_ACTION_INTERVALS.at(-1)!);
  return NYX_RANDOM_ACTION_INTERVALS.reduce((nearest, candidate) =>
    Math.abs(candidate - bounded) < Math.abs(nearest - bounded) ? candidate : nearest,
  );
}
