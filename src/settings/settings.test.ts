import { describe, expect, it } from 'vitest';
import { defaultSettings, loadSettings, sanitizeSettings, saveSettings } from './settings';

describe('settings', () => {
  it('falls back to safe defaults for invalid JSON', () => {
    expect(loadSettings({ getItem: () => '{bad json' })).toEqual(defaultSettings);
  });

  it('bounds refresh cadence and notification thresholds', () => {
    expect(
      sanitizeSettings({
        autoRefreshSeconds: 1,
        notificationThresholds: [10, 20, 10, 0, 101, Number.NaN],
      }),
    ).toMatchObject({ autoRefreshSeconds: 30, notificationThresholds: [20, 10] });
  });

  it('accepts only supported reset reminder windows', () => {
    expect(sanitizeSettings({ resetNotificationMinutes: 30 }).resetNotificationMinutes).toBe(30);
    expect(sanitizeSettings({ resetNotificationMinutes: 17 }).resetNotificationMinutes).toBe(
      defaultSettings.resetNotificationMinutes,
    );
    expect(sanitizeSettings({ resetNotificationMinutes: 0 }).resetNotificationMinutes).toBe(0);
  });

  it('sanitizes provider visibility and operator mode', () => {
    expect(
      sanitizeSettings({
        enabledProviders: ['codex', 'cursor'],
        operatorMode: 'male',
      }),
    ).toMatchObject({ enabledProviders: ['codex', 'cursor'], operatorMode: 'male' });
  });

  it('keeps operator test controls disabled by default and persists an explicit opt-in', () => {
    expect(sanitizeSettings({}).operatorTestControlsEnabled).toBe(false);
    expect(sanitizeSettings({ operatorTestControlsEnabled: true }).operatorTestControlsEnabled).toBe(true);
  });

  it('drops retired provider IDs from persisted settings', () => {
    const persisted = JSON.parse('{"enabledProviders":["codex","antigravity"]}');
    expect(sanitizeSettings(persisted).enabledProviders).toEqual(['codex']);
  });

  it('migrates the legacy operatorEnabled flag', () => {
    expect(sanitizeSettings({ operatorEnabled: false })).toMatchObject({ operatorMode: 'off' });
  });

  it('persists only sanitized settings', () => {
    let written = '';
    saveSettings(
      { ...defaultSettings, autoRefreshSeconds: 5 },
      { setItem: (_key, value) => (written = value) },
    );
    expect(JSON.parse(written).autoRefreshSeconds).toBe(30);
  });
});
