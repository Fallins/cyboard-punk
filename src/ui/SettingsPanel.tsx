import { For, onCleanup, onMount } from 'solid-js';
import type { ProviderId } from '../domain/types';
import { allProviders, type AppSettings, type OperatorMode } from '../settings/settings';
import './settings.css';

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
}

const providerLabels: Record<ProviderId, string> = {
  codex: 'Codex',
  claude: 'Claude Code',
  cursor: 'Cursor',
};

export default function SettingsPanel(props: SettingsPanelProps) {
  let closeButton: HTMLButtonElement | undefined;

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    props.onChange({ ...props.settings, [key]: value });
  };

  const toggleProvider = (provider: ProviderId, enabled: boolean) => {
    const next = enabled
      ? [...props.settings.enabledProviders, provider]
      : props.settings.enabledProviders.filter((candidate) => candidate !== provider);
    update('enabledProviders', allProviders.filter((candidate) => next.includes(candidate)));
  };

  onMount(() => {
    queueMicrotask(() => closeButton?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      props.onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    onCleanup(() => document.removeEventListener('keydown', onKeyDown));
  });

  return (
    <aside
      id="cyboard-settings"
      class="settings-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cyboard-settings-title">
      <div class="settings-panel__topline" />
      <div class="panel-heading">
        <div>
          <p class="eyebrow">SYSTEM CONFIG</p>
          <h2 id="cyboard-settings-title">Settings</h2>
        </div>
        <button
          ref={(element) => {
            closeButton = element;
          }}
          class="icon-button"
          aria-label="Close settings"
          onClick={props.onClose}>
          ×
        </button>
      </div>

      <section class="settings-section">
        <div class="settings-section__heading">
          <strong>Providers</strong>
          <small>Only enabled providers appear in quota, routing, trend, session and notification surfaces.</small>
        </div>
        <div class="provider-toggle-grid">
          <For each={allProviders}>
            {(provider) => (
              <label class="provider-toggle">
                <span>{providerLabels[provider]}</span>
                <input
                  type="checkbox"
                  checked={props.settings.enabledProviders.includes(provider)}
                  onChange={(event) => toggleProvider(provider, event.currentTarget.checked)}
                />
              </label>
            )}
          </For>
        </div>
      </section>

      <section class="settings-section settings-section--controls">
        <div class="settings-section__heading">
          <strong>Experience</strong>
          <small>Operator characters are still preview scaffolds until the production NYX / AXON assets are created.</small>
        </div>

        <label class="setting-row">
          <span>
            <strong>Operator</strong>
            <small>Keep the holographic preview, switch profile, or disable the renderer entirely.</small>
          </span>
          <select
            aria-label="Operator"
            value={props.settings.operatorMode}
            onChange={(event) => update('operatorMode', event.currentTarget.value as OperatorMode)}>
            <option value="female">NYX preview</option>
            <option value="male">AXON preview</option>
            <option value="off">Off</option>
          </select>
        </label>

        <label class="setting-row">
          <span>
            <strong>Auto refresh</strong>
            <small>Native provider throttles still protect upstream endpoints.</small>
          </span>
          <select
            value={props.settings.autoRefreshSeconds}
            onChange={(event) => update('autoRefreshSeconds', Number(event.currentTarget.value))}>
            <option value="30">30 sec</option>
            <option value="60">1 min</option>
            <option value="180">3 min</option>
            <option value="300">5 min</option>
          </select>
        </label>

        <label class="setting-row setting-row--toggle">
          <span>
            <strong>Quota notifications</strong>
            <small>Alerts at {props.settings.notificationThresholds.join(' / ')}% remaining.</small>
          </span>
          <input
            type="checkbox"
            checked={props.settings.notificationsEnabled}
            onChange={(event) => update('notificationsEnabled', event.currentTarget.checked)}
          />
        </label>

        <label class="setting-row">
          <span>
            <strong>Reset reminder</strong>
            <small>Notify before a known quota reset while CYBOARD is running.</small>
          </span>
          <select
            aria-label="Reset reminder"
            disabled={!props.settings.notificationsEnabled}
            value={props.settings.resetNotificationMinutes}
            onChange={(event) => update('resetNotificationMinutes', Number(event.currentTarget.value))}>
            <option value="0">Off</option>
            <option value="5">5 min before</option>
            <option value="10">10 min before</option>
            <option value="30">30 min before</option>
            <option value="60">1 hour before</option>
          </select>
        </label>

        <label class="setting-row setting-row--toggle">
          <span>
            <strong>Launch at login</strong>
            <small>Start CYBOARD with macOS and keep it available from the menu bar.</small>
          </span>
          <input
            type="checkbox"
            checked={props.settings.launchAtLogin}
            onChange={(event) => update('launchAtLogin', event.currentTarget.checked)}
          />
        </label>
      </section>
    </aside>
  );
}
