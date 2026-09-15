import { For, createSignal, onCleanup, onMount } from 'solid-js';
import packageMetadata from '../../package.json';
import type { ProviderId } from '../domain/types';
import { canOpenExperimentalVrmPreview, openExperimentalVrmPreview } from '../experiments/tauriVrmPreview';
import {
  EXPERIMENTAL_VRM_CHARACTERS,
  isNyxRuntimeMotionId,
  NYX_RANDOM_ACTION_INTERVALS,
  NYX_REST_MOTION_ID,
  NYX_RUNTIME_EVENTS,
  nyxLocalizedLabel,
  nyxProductionVrmMotions,
  type NyxRuntimeEvent,
  type NyxRuntimeMotionId,
} from '../experiments/nyxVroidExperiment';
import type { AppLanguage } from '../i18n/core';
import { useI18n } from '../i18n/context';
import {
  allProviders,
  MAX_NYX_CHARACTER_SCALE,
  MIN_NYX_CHARACTER_SCALE,
  type AppSettings,
  type NotificationPersonality,
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

const NYX_CHARACTER_SCALE_STEP = 0.05;

export default function SettingsPanel(props: SettingsPanelProps) {
  const { t, language } = useI18n();
  const [openingPlayground, setOpeningPlayground] = createSignal(false);
  const [playgroundError, setPlaygroundError] = createSignal<string | null>(null);
  const playgroundAvailable = canOpenExperimentalVrmPreview();
  const restMotionLabel = () =>
    language() === 'zh-TW' ? '放鬆 + Sig Breath（不播放 VRMA）' : 'Relaxed + Sig Breath (no VRMA)';
  const eventLabel = (event: NyxRuntimeEvent) => {
    if (language() === 'en') return event[0]!.toUpperCase() + event.slice(1);
    return {
      idle: '待機',
      observing: '觀察',
      processing: '處理',
      warning: '警告',
      success: '成功',
      offline: '離線',
    }[event];
  };
  const eventActionLabel = (event: NyxRuntimeEvent) =>
    language() === 'zh-TW' ? `${eventLabel(event)}動作` : `${eventLabel(event)} action`;
  let closeButton: HTMLButtonElement | undefined;

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    props.onChange({ ...props.settings, [key]: value });
  };

  const toggleProvider = (provider: ProviderId, enabled: boolean) => {
    const next = enabled
      ? [...props.settings.enabledProviders, provider]
      : props.settings.enabledProviders.filter((candidate) => candidate !== provider);
    update(
      'enabledProviders',
      allProviders.filter((candidate) => next.includes(candidate)),
    );
  };

  const updateEventMotion = (event: NyxRuntimeEvent, motion: string) => {
    if (!isNyxRuntimeMotionId(motion)) return;
    update('nyxEventMotions', {
      ...props.settings.nyxEventMotions,
      [event]: motion as NyxRuntimeMotionId,
    });
  };

  const updateRandomActionInterval = (value: number) => {
    if (!NYX_RANDOM_ACTION_INTERVALS.some((candidate) => candidate === value)) return;
    update('nyxRandomActionIntervalSeconds', value as AppSettings['nyxRandomActionIntervalSeconds']);
  };

  const updateCharacterScale = (value: number) => {
    if (!Number.isFinite(value)) return;
    update('nyxCharacterScale', Math.min(MAX_NYX_CHARACTER_SCALE, Math.max(MIN_NYX_CHARACTER_SCALE, value)));
  };

  const updateCharacter = (id: string) => {
    if (id === 'off') {
      update('operatorMode', 'off');
      return;
    }
    const character = EXPERIMENTAL_VRM_CHARACTERS.find((candidate) => candidate.id === id);
    if (!character) return;
    props.onChange({
      ...props.settings,
      operatorMode: 'female',
      nyxCharacterId: character.id,
      nyxOutfitId: character.defaultOutfitId,
      nyxCameraView: null,
    });
  };

  const openPlayground = async () => {
    if (!playgroundAvailable || openingPlayground()) return;
    setOpeningPlayground(true);
    setPlaygroundError(null);
    try {
      await openExperimentalVrmPreview(undefined, props.settings.language, props.settings.nyxCharacterId);
    } catch (error) {
      setPlaygroundError(
        error instanceof Error
          ? error.message
          : language() === 'zh-TW'
            ? '無法開啟本機 VRM 角色工作台。'
            : 'Unable to open the local VRM character workbench.',
      );
    } finally {
      setOpeningPlayground(false);
    }
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
      <header class="settings-panel__header">
        <div class="settings-panel__topline" />
        <div class="panel-heading">
          <div>
            <p class="eyebrow">{t('systemConfig')}</p>
            <h2 id="cyboard-settings-title">{language() === 'zh-TW' ? '設定' : 'Settings'}</h2>
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
      </header>

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
          <strong>{t('providers')}</strong>
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
          <small>
            {language() === 'zh-TW'
              ? '選擇主視窗的 Operator 呈現。'
              : 'Choose the Operator presentation for the main window.'}
          </small>
        </div>

        <label class="setting-row">
          <span>
            <strong>{t('operator')}</strong>
            <small>{t('operatorHelp')}</small>
          </span>
          <select
            aria-label={t('operator')}
            value={props.settings.operatorMode === 'off' ? 'off' : props.settings.nyxCharacterId}
            onChange={(event) => updateCharacter(event.currentTarget.value)}>
            <For each={EXPERIMENTAL_VRM_CHARACTERS}>
              {(character) => (
                <option value={character.id}>{`${nyxLocalizedLabel(character, language())} // NYX`}</option>
              )}
            </For>
            <option value="off">{t('off')}</option>
          </select>
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
            <option value="30">{language() === 'zh-TW' ? '30s' : '30 sec'}</option>
            <option value="60">{language() === 'zh-TW' ? '1min' : '1 min'}</option>
            <option value="180">{language() === 'zh-TW' ? '3min' : '3 min'}</option>
            <option value="300">{language() === 'zh-TW' ? '5min' : '5 min'}</option>
          </select>
        </label>

        <label class="setting-row setting-row--toggle">
          <span>
            <strong>{t('quotaNotifications')}</strong>
            <small>
              {language() === 'zh-TW'
                ? `${props.settings.notificationThresholds.join(' / ')}% 剩餘時提醒。`
                : `Alerts at ${props.settings.notificationThresholds.join(' / ')}% remaining.`}
            </small>
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
            <option value="5">{language() === 'zh-TW' ? '5min' : '5 min before'}</option>
            <option value="10">{language() === 'zh-TW' ? '10min' : '10 min before'}</option>
            <option value="30">{language() === 'zh-TW' ? '30min' : '30 min before'}</option>
            <option value="60">{language() === 'zh-TW' ? '1h' : '1 hour before'}</option>
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

      <section class="settings-section" aria-label={language() === 'zh-TW' ? '角色動作' : 'Character actions'}>
        <div class="settings-section__heading">
          <strong>{language() === 'zh-TW' ? '角色動作' : 'Character actions'}</strong>
          <small>
            {language() === 'zh-TW'
              ? '每個狀態只可選擇已核准的動作。降低動態效果時會維持靜態放鬆姿勢。'
              : 'Each state can use only an approved action. Reduced motion keeps a static relaxed rest pose.'}
          </small>
        </div>

        <For each={NYX_RUNTIME_EVENTS}>
          {(event) => (
            <label class="setting-row">
              <span>
                <strong>{eventActionLabel(event)}</strong>
                <small>
                  {event === 'idle'
                    ? language() === 'zh-TW'
                      ? '預設：放鬆 70% + Sig Breath。'
                      : 'Default: relaxed 70% + Sig Breath.'
                    : language() === 'zh-TW'
                      ? '狀態未改變時不會重播。'
                      : 'Does not replay while the state is unchanged.'}
                </small>
              </span>
              <select
                aria-label={eventActionLabel(event)}
                value={props.settings.nyxEventMotions[event]}
                onChange={(change) => updateEventMotion(event, change.currentTarget.value)}>
                <option value={NYX_REST_MOTION_ID}>{restMotionLabel()}</option>
                <For each={nyxProductionVrmMotions()}>
                  {(motion) => <option value={motion.id}>{nyxLocalizedLabel(motion, language())}</option>}
                </For>
              </select>
            </label>
          )}
        </For>

        <label class="setting-row setting-row--toggle">
          <span>
            <strong>{language() === 'zh-TW' ? '隨機動作' : 'Random actions'}</strong>
            <small>
              {language() === 'zh-TW'
                ? '僅在角色可見、文件可見且未降低動態效果時執行；事件動作優先。'
                : 'Runs only while visible and motion is allowed; event actions take priority.'}
            </small>
          </span>
          <input
            type="checkbox"
            aria-label={language() === 'zh-TW' ? '隨機動作' : 'Random actions'}
            checked={props.settings.nyxRandomActionsEnabled}
            onChange={(event) => update('nyxRandomActionsEnabled', event.currentTarget.checked)}
          />
        </label>

        <label class="setting-row">
          <span>
            <strong>{language() === 'zh-TW' ? '隨機動作間隔' : 'Random action interval'}</strong>
            <small>{language() === 'zh-TW' ? '只接受已核准的間隔。' : 'Only approved intervals are accepted.'}</small>
          </span>
          <select
            aria-label={language() === 'zh-TW' ? '隨機動作間隔' : 'Random action interval'}
            value={props.settings.nyxRandomActionIntervalSeconds}
            onChange={(event) => updateRandomActionInterval(Number(event.currentTarget.value))}>
            <For each={NYX_RANDOM_ACTION_INTERVALS}>
              {(seconds) => (
                <option value={seconds}>{language() === 'zh-TW' ? `${seconds} 秒` : `${seconds} sec`}</option>
              )}
            </For>
          </select>
        </label>

        <label class="setting-row setting-row--range">
          <span>
            <strong>{language() === 'zh-TW' ? '角色縮放' : 'Character scale'}</strong>
            <small>
              {language() === 'zh-TW'
                ? '僅改變舞台比例，不重新載入目前角色。'
                : 'Changes stage scale without reloading the current character.'}
            </small>
          </span>
          <span class="setting-range-control">
            <input
              type="range"
              min={MIN_NYX_CHARACTER_SCALE}
              max={MAX_NYX_CHARACTER_SCALE}
              step={NYX_CHARACTER_SCALE_STEP}
              aria-label={language() === 'zh-TW' ? '角色縮放' : 'Character scale'}
              value={props.settings.nyxCharacterScale}
              onInput={(event) => updateCharacterScale(event.currentTarget.valueAsNumber)}
            />
            <output>{Math.round(props.settings.nyxCharacterScale * 100)}%</output>
          </span>
        </label>
      </section>

      <section class="settings-section" aria-label={language() === 'zh-TW' ? '角色工作台' : 'Character workbench'}>
        <div class="settings-section__heading">
          <strong>{language() === 'zh-TW' ? '角色工作台' : 'Character workbench'}</strong>
          <small>
            {language() === 'zh-TW'
              ? '在可旋轉、縮放的舞台內檢視角色與服裝相容性。正式角色動作設定在上方。'
              : 'Inspect character and outfit compatibility in an interactive stage. Production action settings are above.'}
          </small>
        </div>
        <button
          type="button"
          class="settings-experiment-launch"
          aria-label={language() === 'zh-TW' ? '開啟角色工作台' : 'Open character workbench'}
          disabled={!playgroundAvailable || openingPlayground()}
          onClick={() => void openPlayground()}>
          {openingPlayground()
            ? language() === 'zh-TW'
              ? '正在開啟角色工作台…'
              : 'Opening character workbench…'
            : language() === 'zh-TW'
              ? '開啟角色工作台'
              : 'Open character workbench'}
        </button>
        {playgroundError() && (
          <p class="settings-experiment-error" role="alert">
            {playgroundError()}
          </p>
        )}
      </section>

      <footer class="settings-panel__footer" aria-label="CYBOARD version">
        <span>CYBOARD</span>
        <strong>v{packageMetadata.version}</strong>
        <small>ALPHA</small>
      </footer>
    </aside>
  );
}
