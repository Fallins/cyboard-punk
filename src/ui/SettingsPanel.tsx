import { For, onCleanup, onMount } from 'solid-js';
import type { ProviderId } from '../domain/types';
import type { AppLanguage } from '../i18n/core';
import { useI18n } from '../i18n/context';
import {
  allProviders,
  type AppSettings,
  type NotificationPersonality,
  type OperatorMode,
} from '../settings/settings';
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
  const { t } = useI18n();
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
          <p class="eyebrow">{t('systemConfig')}</p>
          <h2 id="cyboard-settings-title">{t('settings')}</h2>
        </div>
        <button
          ref={(element) => {
            closeButton = element;
          }}
          class="icon-button"
          aria-label={t('closeSettings')}
          onClick={props.onClose}>
          ×
        </button>
      </div>

      <section class="settings-section settings-section--controls">
        <label class="setting-row">
          <span>
            <strong>{t('language')}</strong>
            <small>{t('languageHelp')}</small>
          </span>
          <select
            aria-label={t('language')}
            value={props.settings.language}
            onChange={(event) => update('language', event.currentTarget.value as AppLanguage)}>
            <option value="en">English</option>
            <option value="zh-TW">中文</option>
          </select>
        </label>
      </section>

      <section class="settings-section">
        <div class="settings-section__heading">
          <strong>Providers</strong>
          <small>{t('enabledProvidersHelp')}</small>
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
          <strong>{t('experience')}</strong>
          <small>{t('nyxTestHelp')}</small>
        </div>

        <label class="setting-row">
          <span>
            <strong>{t('operator')}</strong>
            <small>{t('operatorHelp')}</small>
          </span>
          <select
            aria-label={t('operator')}
            value={props.settings.operatorMode}
            onChange={(event) => update('operatorMode', event.currentTarget.value as OperatorMode)}>
            <option value="female">NYX</option>
            <option value="male">AXON preview</option>
            <option value="off">{t('off')}</option>
          </select>
        </label>

        <label class="setting-row setting-row--toggle">
          <span>
            <strong>{t('nyxTestControls')}</strong>
            <small>{t('nyxTestHelp')}</small>
          </span>
          <input
            type="checkbox"
            aria-label={t('nyxTestControls')}
            checked={props.settings.operatorTestControlsEnabled}
            onChange={(event) => update('operatorTestControlsEnabled', event.currentTarget.checked)}
          />
        </label>

        <label class="setting-row">
          <span>
            <strong>{t('autoRefresh')}</strong>
            <small>{t('autoRefreshHelp')}</small>
          </span>
          <select
            aria-label={t('autoRefresh')}
            value={props.settings.autoRefreshSeconds}
            onChange={(event) => update('autoRefreshSeconds', Number(event.currentTarget.value))}>
            <option value="30">{t('seconds30')}</option>
            <option value="60">{t('minute1')}</option>
            <option value="180">{t('minutes3')}</option>
            <option value="300">{t('minutes5')}</option>
          </select>
        </label>

        <label class="setting-row setting-row--toggle">
          <span>
            <strong>{t('quotaNotifications')}</strong>
            <small>{props.settings.notificationThresholds.join(' / ')}% {t('left')}</small>
          </span>
          <input
            type="checkbox"
            aria-label={t('quotaNotifications')}
            checked={props.settings.notificationsEnabled}
            onChange={(event) => update('notificationsEnabled', event.currentTarget.checked)}
          />
        </label>

        <label class="setting-row">
          <span>
            <strong>{t('notificationStyle')}</strong>
            <small>{t('notificationStyleHelp')}</small>
          </span>
          <select
            aria-label={t('notificationStyle')}
            disabled={!props.settings.notificationsEnabled}
            value={props.settings.notificationPersonality}
            onChange={(event) =>
              update('notificationPersonality', event.currentTarget.value as NotificationPersonality)
            }>
            <option value="system">{t('systemStyle')}</option>
            <option value="nyx">{t('nyxStyle')}</option>
            <option value="minimal">{t('minimalStyle')}</option>
          </select>
        </label>

        <label class="setting-row">
          <span>
            <strong>{t('resetReminder')}</strong>
            <small>{t('resetReminderHelp')}</small>
          </span>
          <select
            aria-label={t('resetReminder')}
            disabled={!props.settings.notificationsEnabled}
            value={props.settings.resetNotificationMinutes}
            onChange={(event) => update('resetNotificationMinutes', Number(event.currentTarget.value))}>
            <option value="0">{t('off')}</option>
            <option value="5">5M</option>
            <option value="10">10M</option>
            <option value="30">30M</option>
            <option value="60">1H</option>
          </select>
        </label>

        <label class="setting-row setting-row--toggle">
          <span>
            <strong>{t('launchAtLogin')}</strong>
            <small>{t('launchAtLoginHelp')}</small>
          </span>
          <input
            type="checkbox"
            aria-label={t('launchAtLogin')}
            checked={props.settings.launchAtLogin}
            onChange={(event) => update('launchAtLogin', event.currentTarget.checked)}
          />
        </label>
      </section>
    </aside>
  );
}
