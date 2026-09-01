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

  it('sanitizes provider visibility and operator mode', () => {
    expect(
      sanitizeSettings({
        enabledProviders: ['codex', 'antigravity'],
        operatorMode: 'male',
      }),
    ).toMatchObject({ enabledProviders: ['codex', 'antigravity'], operatorMode: 'male' });
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
