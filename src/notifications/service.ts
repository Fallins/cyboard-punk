import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import type { ProviderSnapshot } from '../domain/types';
import type { AppSettings } from '../settings/settings';
import { renderNotificationCopy } from './personality';
import { quotaAlerts, resetAlerts } from './rules';

const notifiedStorageKey = 'cyboard.notifications.sent.v1';

export async function notifyQuotaAlerts(
  snapshots: ProviderSnapshot[],
  settings: AppSettings,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): Promise<number> {
  if (!settings.notificationsEnabled) return 0;
  const sent = loadSent(storage);
  const alerts = [
    ...quotaAlerts(snapshots, settings.notificationThresholds, sent),
    ...resetAlerts(snapshots, settings.resetNotificationMinutes, sent),
  ];
  if (!alerts.length) return 0;

  let granted = await isPermissionGranted();
  if (!granted) {
    granted = (await requestPermission()) === 'granted';
  }
  if (!granted) return 0;

  for (const alert of alerts) {
    const copy = renderNotificationCopy(alert, settings.notificationPersonality);
    sendNotification(copy);
    sent.add(alert.key);
  }
  trimAndSave(sent, storage);
  return alerts.length;
}

function loadSent(storage: Pick<Storage, 'getItem'>): Set<string> {
  try {
    const raw = storage.getItem(notifiedStorageKey);
    if (!raw) return new Set();
    const values = JSON.parse(raw);
    return new Set(Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : []);
  } catch {
    return new Set();
  }
}

function trimAndSave(sent: Set<string>, storage: Pick<Storage, 'setItem'>) {
  storage.setItem(notifiedStorageKey, JSON.stringify([...sent].slice(-200)));
}
