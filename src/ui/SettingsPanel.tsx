import { For, Show, createSignal, onMount } from 'solid-js';
import type { ProviderId } from '../domain/types';
import { TauriProviderClient, type AntigravityAuthStatus } from '../providers/client';
import { allProviders, type AppSettings, type OperatorMode } from '../settings/settings';
import './settings.css';

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
  onProviderRefresh?: () => void | Promise<void>;
}

const providerLabels: Record<ProviderId, string> = {
  codex: 'Codex',
  claude: 'Claude Code',
  cursor: 'Cursor',
  antigravity: 'Antigravity',
};

const providerClient = new TauriProviderClient();

export default function SettingsPanel(props: SettingsPanelProps) {
  const [antigravityAuth, setAntigravityAuth] = createSignal<AntigravityAuthStatus | null>(null);
  const [antigravityAuthLoading, setAntigravityAuthLoading] = createSignal(true);
  const [antigravityAuthBusy, setAntigravityAuthBusy] = createSignal(false);
  const [antigravityAuthError, setAntigravityAuthError] = createSignal<string | null>(null);
  const isTauriRuntime = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    props.onChange({ ...props.settings, [key]: value });
  };

  const toggleProvider = (provider: ProviderId, enabled: boolean) => {
    const next = enabled
      ? [...props.settings.enabledProviders, provider]
      : props.settings.enabledProviders.filter((candidate) => candidate !== provider);
    update('enabledProviders', allProviders.filter((candidate) => next.includes(candidate)));
  };

  const refreshAntigravityAuth = async () => {
    if (!isTauriRuntime) {
      setAntigravityAuthLoading(false);
      return;
    }
    setAntigravityAuthLoading(true);
    try {
      setAntigravityAuth(await providerClient.antigravityAuthStatus());
    } catch (error) {
      setAntigravityAuthError(error instanceof Error ? error.message : String(error));
    } finally {
      setAntigravityAuthLoading(false);
    }
  };

  const connectAntigravity = async () => {
    if (!isTauriRuntime || antigravityAuthBusy()) return;
    setAntigravityAuthBusy(true);
    setAntigravityAuthError(null);
    try {
      setAntigravityAuth(await providerClient.connectAntigravityGoogle());
      await props.onProviderRefresh?.();
    } catch (error) {
      setAntigravityAuthError(error instanceof Error ? error.message : String(error));
    } finally {
      setAntigravityAuthBusy(false);
    }
  };

  const cancelAntigravityConnect = async () => {
    if (!isTauriRuntime || !antigravityAuthBusy()) return;
    setAntigravityAuthError('Cancelling Google connection…');
    try {
      await providerClient.cancelAntigravityGoogle();
    } catch (error) {
      setAntigravityAuthError(error instanceof Error ? error.message : String(error));
    }
  };

  const disconnectAntigravity = async () => {
    if (!isTauriRuntime || antigravityAuthBusy()) return;
    setAntigravityAuthBusy(true);
    setAntigravityAuthError(null);
    try {
      setAntigravityAuth(await providerClient.disconnectAntigravityGoogle());
      await props.onProviderRefresh?.();
    } catch (error) {
      setAntigravityAuthError(error instanceof Error ? error.message : String(error));
    } finally {
      setAntigravityAuthBusy(false);
    }
  };

  onMount(() => {
    void refreshAntigravityAuth();
  });

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

        <div class="provider-connection" data-connected={antigravityAuth()?.connected === true}>
          <div class="provider-connection__copy">
            <strong>Antigravity Cloud</strong>
            <small>
              Local quota stays preferred. Connect Google once so CYBOARD can fetch cloud quota when Antigravity is closed.
            </small>
            <Show
              when={!antigravityAuthLoading()}
              fallback={<span class="provider-connection__status">CHECKING…</span>}>
              <Show
                when={antigravityAuth()?.connected}
                fallback={<span class="provider-connection__status">NOT CONNECTED</span>}>
                <span class="provider-connection__status provider-connection__status--connected">
                  CONNECTED{antigravityAuth()?.email ? ` · ${antigravityAuth()!.email}` : ''}
                </span>
              </Show>
            </Show>
            <Show when={antigravityAuthBusy()}>
              <span class="provider-connection__status">WAITING FOR GOOGLE IN BROWSER</span>
            </Show>
            <Show when={antigravityAuthError() || antigravityAuth()?.message}>
              <span class="provider-connection__error">{antigravityAuthError() ?? antigravityAuth()?.message}</span>
            </Show>
          </div>
          <Show
            when={antigravityAuth()?.connected}
            fallback={
              <button
                class="ghost-button provider-connection__button"
                disabled={!isTauriRuntime || antigravityAuthLoading()}
                onClick={() => void (antigravityAuthBusy() ? cancelAntigravityConnect() : connectAntigravity())}>
                {antigravityAuthBusy() ? 'CANCEL' : 'CONNECT GOOGLE'}
              </button>
            }>
            <button
              class="ghost-button provider-connection__button provider-connection__button--disconnect"
              disabled={!isTauriRuntime || antigravityAuthBusy() || antigravityAuthLoading()}
              onClick={() => void disconnectAntigravity()}>
              {antigravityAuthBusy() ? 'WORKING…' : 'DISCONNECT'}
            </button>
          </Show>
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
    </aside>
  );
}
