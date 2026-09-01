import type { AppSettings } from '../settings/settings';

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
}

export default function SettingsPanel(props: SettingsPanelProps) {
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    props.onChange({ ...props.settings, [key]: value });
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

      <label class="setting-row setting-row--toggle">
        <span>
          <strong>3D Operator</strong>
          <small>Phase 2 renderer; disabled automatically for reduced-motion fallback.</small>
        </span>
        <input
          type="checkbox"
          checked={props.settings.operatorEnabled}
          onChange={(event) => update('operatorEnabled', event.currentTarget.checked)}
        />
      </label>
    </aside>
  );
}
