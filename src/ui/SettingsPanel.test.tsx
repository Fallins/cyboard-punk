import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import packageMetadata from '../../package.json';
import { I18nProvider } from '../i18n/context';
import { defaultSettings } from '../settings/settings';
import SettingsPanel from './SettingsPanel';

afterEach(cleanup);

describe('SettingsPanel', () => {
  it('renders an accessible dialog with the supported provider controls and current version', () => {
    render(() => <SettingsPanel settings={defaultSettings} onChange={() => undefined} onClose={() => undefined} />);

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /Codex/ })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /Claude Code/ })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /Cursor/ })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: 'NYX test controls' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Open character workbench' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Notification style' })).toBeTruthy();
    expect(screen.getByText(`v${packageMetadata.version}`)).toBeTruthy();
    expect(screen.getByText('ALPHA')).toBeTruthy();
    expect(screen.queryByText('Antigravity Cloud')).toBeNull();
  });

  it('renders Traditional Chinese presentation copy with standard compact time units', () => {
    render(() => (
      <I18nProvider language="zh-TW">
        <SettingsPanel
          settings={{ ...defaultSettings, language: 'zh-TW' }}
          onChange={() => undefined}
          onClose={() => undefined}
        />
      </I18nProvider>
    ));

    expect(screen.getByRole('dialog', { name: '設定' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: '語言' })).toBeTruthy();
    expect(screen.getByText('Claude Code')).toBeTruthy();
    expect(screen.getByText('自動更新')).toBeTruthy();
    expect(screen.getByText('通知風格')).toBeTruthy();
    expect(screen.getByText('角色動作')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: '待機動作' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: '隨機動作' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: '角色縮放' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '開啟角色工作台' })).toBeTruthy();

    const autoRefresh = screen.getByRole('combobox', { name: '自動更新' }) as HTMLSelectElement;
    const resetReminder = screen.getByRole('combobox', { name: '重置提醒' }) as HTMLSelectElement;
    expect(Array.from(autoRefresh.options).map((option) => option.text)).toEqual(['30s', '1min', '3min', '5min']);
    expect(Array.from(resetReminder.options).map((option) => option.text)).toEqual([
      '關閉',
      '5min',
      '10min',
      '30min',
      '1h',
    ]);
  });

  it('exposes only allowlisted production character actions, random controls, and scale in first-level settings', () => {
    render(() => <SettingsPanel settings={defaultSettings} onChange={() => undefined} onClose={() => undefined} />);

    expect(screen.getByText('Character actions')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open character workbench' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Idle action' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Observing action' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Processing action' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Warning action' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Success action' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Offline action' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Random actions' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Random action interval' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Character scale' })).toBeTruthy();

    const idle = screen.getByRole('combobox', { name: 'Idle action' }) as HTMLSelectElement;
    expect(Array.from(idle.options).map((option) => option.value)).toEqual([
      'rest',
      'showFullBody',
      'greeting',
      'peaceSign',
      'shoot',
      'spin',
      'modelPose',
      'squat',
    ]);
    expect(Array.from(idle.options).map((option) => option.value)).not.toContain('allSmilesWorld');
  });

  it('persists only allowlisted event motion, random, interval, and scale values', async () => {
    const onChange = vi.fn();
    render(() => <SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => undefined} />);

    await fireEvent.change(screen.getByRole('combobox', { name: 'Warning action' }), { target: { value: 'shoot' } });
    expect(onChange).toHaveBeenLastCalledWith({
      ...defaultSettings,
      nyxEventMotions: { ...defaultSettings.nyxEventMotions, warning: 'shoot' },
    });

    await fireEvent.change(screen.getByRole('combobox', { name: 'Warning action' }), {
      target: { value: 'untrusted' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);

    await fireEvent.click(screen.getByRole('checkbox', { name: 'Random actions' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...defaultSettings, nyxRandomActionsEnabled: true });

    await fireEvent.change(screen.getByRole('combobox', { name: 'Random action interval' }), {
      target: { value: '120' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ ...defaultSettings, nyxRandomActionIntervalSeconds: 120 });

    await fireEvent.input(screen.getByRole('slider', { name: 'Character scale' }), { target: { value: '1.15' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...defaultSettings, nyxCharacterScale: 1.15 });
  });

  it('changes the persisted UI language without changing unrelated settings', async () => {
    const onChange = vi.fn();
    render(() => <SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => undefined} />);

    const language = screen.getByRole('combobox', { name: 'Language' }) as HTMLSelectElement;
    expect(language.value).toBe('en');
    await fireEvent.change(language, { target: { value: 'zh-TW' } });

    expect(onChange).toHaveBeenCalledWith({ ...defaultSettings, language: 'zh-TW' });
  });

  it('closes from Escape', async () => {
    const onClose = vi.fn();
    render(() => <SettingsPanel settings={defaultSettings} onChange={() => undefined} onClose={onClose} />);

    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('toggles an individual provider without changing unrelated settings', async () => {
    const onChange = vi.fn();
    render(() => <SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => undefined} />);

    const claude = screen.getByRole('checkbox', { name: /Claude Code/ }) as HTMLInputElement;
    expect(claude.checked).toBe(true);
    await fireEvent.click(claude);

    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings,
      enabledProviders: ['codex', 'cursor'],
    });
  });

  it('allows NYX to be disabled without offering retired character renderers', async () => {
    const onChange = vi.fn();
    render(() => <SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => undefined} />);

    const operator = screen.getByRole('combobox', { name: 'Character' }) as HTMLSelectElement;
    await fireEvent.change(operator, { target: { value: 'off' } });

    expect(onChange).toHaveBeenCalledWith({ ...defaultSettings, operatorMode: 'off' });
  });

  it('changes notification personality without changing alert configuration', async () => {
    const onChange = vi.fn();
    render(() => <SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => undefined} />);

    const style = screen.getByRole('combobox', { name: 'Notification style' }) as HTMLSelectElement;
    expect(style.value).toBe('system');
    await fireEvent.change(style, { target: { value: 'nyx' } });

    expect(onChange).toHaveBeenCalledWith({ ...defaultSettings, notificationPersonality: 'nyx' });
  });

  it('disables notification wording controls when notifications are off', () => {
    render(() => (
      <SettingsPanel
        settings={{ ...defaultSettings, notificationsEnabled: false }}
        onChange={() => undefined}
        onClose={() => undefined}
      />
    ));

    const style = screen.getByRole('combobox', { name: 'Notification style' }) as HTMLSelectElement;
    const resetReminder = screen.getByRole('combobox', { name: 'Reset reminder' }) as HTMLSelectElement;
    expect(style.disabled).toBe(true);
    expect(resetReminder.disabled).toBe(true);
  });

  it('changes reset reminder lead time', async () => {
    const onChange = vi.fn();
    render(() => <SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => undefined} />);

    const resetReminder = screen.getByRole('combobox', { name: 'Reset reminder' }) as HTMLSelectElement;
    await fireEvent.change(resetReminder, { target: { value: '30' } });

    expect(onChange).toHaveBeenCalledWith({ ...defaultSettings, resetNotificationMinutes: 30 });
  });
});
