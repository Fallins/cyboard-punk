import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderSnapshot } from '../domain/types';
import { defaultSettings } from '../settings/settings';

const { isPermissionGranted, requestPermission, sendNotification } = vi.hoisted(() => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-notification', () => ({ isPermissionGranted, requestPermission, sendNotification }));

import { notifyQuotaAlerts } from './service';

const snapshot: ProviderSnapshot = {
  provider: 'codex',
  displayName: 'Codex',
  capabilities: ['quota'],
  quota: [{ id: 'weekly', label: '7d', usedPercent: 92, resetAt: '2026-09-07T00:00:00Z' }],
  quotaHistory: [],
  usage: [],
  sessions: [],
  freshness: 'fresh',
  updatedAt: '2026-09-01T00:00:00Z',
};

function memoryStorage() {
  let value: string | null = null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
}

describe('notifyQuotaAlerts', () => {
  beforeEach(() => {
    isPermissionGranted.mockReset();
    requestPermission.mockReset();
    sendNotification.mockReset();
  });

  it('does nothing when notifications are disabled', async () => {
    const count = await notifyQuotaAlerts(
      [snapshot],
      { ...defaultSettings, notificationsEnabled: false },
      memoryStorage(),
    );
    expect(count).toBe(0);
    expect(isPermissionGranted).not.toHaveBeenCalled();
  });

  it('requests permission once and sends the unchanged system alert by default', async () => {
    isPermissionGranted.mockResolvedValue(false);
    requestPermission.mockResolvedValue('granted');
    const count = await notifyQuotaAlerts([snapshot], defaultSettings, memoryStorage());

    expect(count).toBe(1);
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification).toHaveBeenCalledWith({
      title: 'Codex capacity warning',
      body: expect.stringContaining('7d: 8% remaining'),
    });
  });

  it('localizes notification facts and NYX framing in Traditional Chinese with standard time units', async () => {
    isPermissionGranted.mockResolvedValue(true);
    const count = await notifyQuotaAlerts(
      [snapshot],
      { ...defaultSettings, language: 'zh-TW', notificationPersonality: 'nyx' },
      memoryStorage(),
    );

    expect(count).toBe(1);
    expect(sendNotification).toHaveBeenCalledWith({
      title: 'NYX // Codex 額度提醒',
      body: expect.stringMatching(/^Operator 提醒 · 7d 剩 8%/),
    });
  });

  it('applies NYX framing only after alert facts have been resolved', async () => {
    isPermissionGranted.mockResolvedValue(true);
    const count = await notifyQuotaAlerts(
      [snapshot],
      { ...defaultSettings, notificationPersonality: 'nyx' },
      memoryStorage(),
    );

    expect(count).toBe(1);
    expect(sendNotification).toHaveBeenCalledWith({
      title: 'NYX // Codex capacity warning',
      body: expect.stringMatching(/^Operator advisory · 7d: 8% remaining/),
    });
  });

  it('uses the compact minimal title without changing the factual body', async () => {
    isPermissionGranted.mockResolvedValue(true);
    const count = await notifyQuotaAlerts(
      [snapshot],
      { ...defaultSettings, notificationPersonality: 'minimal' },
      memoryStorage(),
    );

    expect(count).toBe(1);
    expect(sendNotification).toHaveBeenCalledWith({
      title: 'CYBOARD · CODEX',
      body: expect.stringContaining('7d: 8% remaining'),
    });
  });

  it('deduplicates a previously sent threshold for the same reset window across personalities', async () => {
    isPermissionGranted.mockResolvedValue(true);
    const storage = memoryStorage();
    expect(await notifyQuotaAlerts([snapshot], defaultSettings, storage)).toBe(1);
    expect(
      await notifyQuotaAlerts(
        [snapshot],
        { ...defaultSettings, notificationPersonality: 'nyx' },
        storage,
      ),
    ).toBe(0);
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });
});
