import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../settings/settings';
import SettingsPanel from './SettingsPanel';

afterEach(cleanup);

describe('SettingsPanel', () => {
  it('toggles an individual provider without changing unrelated settings', async () => {
    const onChange = vi.fn();
    render(() => <SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => undefined} />);

    const claude = screen.getByRole('checkbox', { name: /Claude Code/ }) as HTMLInputElement;
    expect(claude.checked).toBe(true);
    await fireEvent.click(claude);

    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings,
      enabledProviders: ['codex', 'cursor', 'antigravity'],
    });
  });

  it('switches the operator between female, male and off', async () => {
    const onChange = vi.fn();
    render(() => <SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => undefined} />);

    const operator = screen.getByRole('combobox', { name: /Operator/ }) as HTMLSelectElement;
    await fireEvent.change(operator, { target: { value: 'male' } });

    expect(onChange).toHaveBeenCalledWith({ ...defaultSettings, operatorMode: 'male' });
  });

  it('changes reset reminder lead time', async () => {
    const onChange = vi.fn();
    render(() => <SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => undefined} />);

    const resetReminder = screen.getByRole('combobox', { name: 'Reset reminder' }) as HTMLSelectElement;
    await fireEvent.change(resetReminder, { target: { value: '30' } });

    expect(onChange).toHaveBeenCalledWith({ ...defaultSettings, resetNotificationMinutes: 30 });
  });
});
