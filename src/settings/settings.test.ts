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

  it('accepts only supported UI languages', () => {
    expect(sanitizeSettings({ language: 'zh-TW' }).language).toBe('zh-TW');
    expect(sanitizeSettings({ language: 'en' }).language).toBe('en');
    const malformed = JSON.parse('{"language":"zh-CN"}');
    expect(sanitizeSettings(malformed).language).toBe('en');
  });

  it('accepts only supported reset reminder windows', () => {
    expect(sanitizeSettings({ resetNotificationMinutes: 30 }).resetNotificationMinutes).toBe(30);
    expect(sanitizeSettings({ resetNotificationMinutes: 17 }).resetNotificationMinutes).toBe(
      defaultSettings.resetNotificationMinutes,
    );
    expect(sanitizeSettings({ resetNotificationMinutes: 0 }).resetNotificationMinutes).toBe(0);
  });

  it('sanitizes notification personality without changing the migration default', () => {
    expect(sanitizeSettings({}).notificationPersonality).toBe('system');
    expect(sanitizeSettings({ notificationPersonality: 'nyx' }).notificationPersonality).toBe('nyx');
    expect(sanitizeSettings({ notificationPersonality: 'minimal' }).notificationPersonality).toBe('minimal');
    const malformed = JSON.parse('{"notificationPersonality":"loud"}');
    expect(sanitizeSettings(malformed).notificationPersonality).toBe('system');
  });

  it('sanitizes provider visibility and migrates the retired AXON preview to NYX', () => {
    expect(
      sanitizeSettings(JSON.parse(JSON.stringify({
        enabledProviders: ['codex', 'cursor'],
        operatorMode: 'male',
      }))),
    ).toMatchObject({ enabledProviders: ['codex', 'cursor'], operatorMode: 'female' });
  });

  it('drops retired 2.5D test-control data from existing persisted settings', () => {
    expect(sanitizeSettings(JSON.parse('{"operatorTestControlsEnabled":true}'))).not.toHaveProperty('operatorTestControlsEnabled');
  });

  it('drops retired provider IDs from persisted settings', () => {
    const persisted = JSON.parse('{"enabledProviders":["codex","antigravity"]}');
    expect(sanitizeSettings(persisted).enabledProviders).toEqual(['codex']);
  });

  it('migrates the legacy operatorEnabled flag', () => {
    expect(sanitizeSettings({ operatorEnabled: false })).toMatchObject({ operatorMode: 'off' });
  });

  it('persists only allowlisted NYX event motions and clamps random playback settings', () => {
    const sanitized = sanitizeSettings({
      nyxEventMotions: {
        idle: 'greeting',
        warning: 'file:///tmp/untrusted.vrma',
        offline: 'wonderfulWorld',
      },
      nyxRandomActionsEnabled: true,
      nyxRandomActionIntervalSeconds: 9_999,
      nyxCharacterScale: 99,
    });

    expect(sanitized.nyxEventMotions.idle).toBe('greeting');
    expect(sanitized.nyxEventMotions.warning).toBe('rest');
    expect(sanitized.nyxEventMotions.offline).toBe('rest');
    expect(sanitized.nyxRandomActionsEnabled).toBe(true);
    expect(sanitized.nyxRandomActionIntervalSeconds).toBe(300);
    expect(sanitized.nyxCharacterScale).toBe(1.35);
  });

  it('uses relaxed Sig Breath rest defaults and normalizes unsupported random intervals', () => {
    const sanitized = sanitizeSettings({
      nyxEventMotions: { idle: 'rest', processing: 'peaceSign' },
      nyxRandomActionIntervalSeconds: 89,
    });

    expect(sanitized.nyxEventMotions).toMatchObject({
      idle: 'rest',
      observing: 'rest',
      processing: 'peaceSign',
      warning: 'rest',
      success: 'rest',
      offline: 'rest',
    });
    expect(sanitized.nyxRandomActionIntervalSeconds).toBe(60);
  });

  it('persists the explicit stage-interaction lock only when enabled', () => {
    expect(sanitizeSettings({ nyxStageInteractionLocked: true }).nyxStageInteractionLocked).toBe(true);
    expect(sanitizeSettings({ nyxStageInteractionLocked: false }).nyxStageInteractionLocked).toBe(false);
    expect(sanitizeSettings({ nyxStageInteractionLocked: 'yes' as never }).nyxStageInteractionLocked).toBe(false);
  });

  it('keeps character selection on a reviewed catalog entry', () => {
    expect(sanitizeSettings({ nyxCharacterId: 'fdl-vrm-1-0' }).nyxCharacterId).toBe(defaultSettings.nyxCharacterId);
    expect(sanitizeSettings({ nyxCharacterId: 'file:///tmp/untrusted.glb' }).nyxCharacterId).toBe(
      defaultSettings.nyxCharacterId,
    );
  });

  it('keeps an outfit on a reviewed variation for the selected character', () => {
    expect(sanitizeSettings({ nyxCharacterId: 'fdl-vrm-1-0', nyxOutfitId: 'base' })).toMatchObject({
      nyxCharacterId: defaultSettings.nyxCharacterId,
      nyxOutfitId: 'base',
    });
    expect(sanitizeSettings({ nyxOutfitId: 'techwearCropRed' }).nyxOutfitId).toBe('base');
    expect(sanitizeSettings({ nyxOutfitId: 'file:///tmp/untrusted.png' }).nyxOutfitId).toBe('base');
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
