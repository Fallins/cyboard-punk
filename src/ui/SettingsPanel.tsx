import { For } from 'solid-js';
import type { ProviderId } from '../domain/types';
import { allProviders, type AppSettings, type OperatorMode } from '../settings/settings';

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
}

const providerLabels: Record<ProviderId, string> = {
  codex: 'Codex',
  claude: 'Claude Code',
  cursor: 'Cursor',
  antigravity: 'Antigravity',
};

export default function SettingsPanel(props: SettingsPanelProps) {
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    props.onChange({ ...props.settings, [key]: value });
  };

  const toggleProvider = (provider: ProviderId, enabled: boolean) => {
    const next = enabled
      ? [...props.settings.enabledProviders, provider]
      : props.settings.enabledProviders.filter((candidate) => candidate !== provider);
    update('enabledProviders', allProviders.filter((candidate) => next.includes(candidate)));
  };

  return (
    <aside class="settings-panel" aria-label="CYBOARD settings">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">SYSTEM CONFIG</p>
          <h2>Settings</h2>
        </div>
        <button class="icon-button" aria-label="Close settings" onClick={props.onClose}>×</button>
      </div>

      <section class="settings-section">
        <div class="settings-section__heading">
          <strong>Providers</strong>
          <small>Choose which coding-agent quota cards are visible in CYBOARD.</small>
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

      <label class="setting-row">
        <span>
          <strong>Operator</strong>
          <small>Phase 2 holographic operator. Turn it off for the lightest possible dashboard.</small>
        </span>
        <select
          value={props.settings.operatorMode}
          onChange={(event) => update('operatorMode', event.currentTarget.value as OperatorMode)}>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="off">Off</option>
        </select>
      </label>

      <label class="setting-row">
        <span>
          <strong>Auto refresh</strong>
          <small>Quota calls are still protected by the native provider throttle.</small>
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
    </aside>
  );
}
