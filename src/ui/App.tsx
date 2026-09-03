import { For, Show, createEffect, createMemo, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import { forecastQuota } from '../domain/forecast';
import { providerEvidence } from '../domain/providerEvidence';
import { isProviderReady } from '../domain/providerStatus';
import { emptySessionCloseoutState, observeSessionCloseouts } from '../domain/sessionCloseout';
import { buildStatusIntelligence } from '../domain/statusIntelligence';
import type { ProviderSnapshot, QuotaWindow } from '../domain/types';
import { formatQuotaWindowLabel, freshnessText, providerIssueText } from '../i18n/core';
import { I18nProvider, useI18n } from '../i18n/context';
import { notifyQuotaAlerts } from '../notifications/service';
import { TauriProviderClient } from '../providers/client';
import { readLaunchAtLogin, setLaunchAtLogin } from '../settings/autostart';
import { loadSettings, saveSettings, sanitizeSettings, type AppSettings } from '../settings/settings';
import CapacityRouting from './CapacityRouting';
import type { Nyx2DAttentionTarget } from './nyx2dAttention';
import OperatorBrief from './OperatorBrief';
import OperatorSimulator from './OperatorSimulator';
import OperatorStage from './OperatorStage';
import {
  NYX_2D_TEST_TUNING,
  clampNyx2DTuningValue,
  type Nyx2DMotionTuning,
  type Nyx2DMotionTuningKey,
} from './nyx2dTuning';
import {
  buildOperatorProviderPanels,
  type OperatorRuntimeState,
  type OperatorTransientState,
} from './operatorRuntime';
import QuotaTrend from './QuotaTrend';
import SessionCloseouts from './SessionCloseouts';
import SettingsPanel from './SettingsPanel';
import UsageActivity from './UsageActivity';
import './provider-evidence.css';

const client = new TauriProviderClient();

function used(window: QuotaWindow) {
  return Math.max(0, Math.min(100, window.usedPercent));
}

function remaining(window: QuotaWindow) {
  return 100 - used(window);
}

function quotaTone(window: QuotaWindow) {
  const left = remaining(window);
  if (left <= 10) return 'critical';
  if (left <= 25) return 'warning';
  return 'healthy';
}

function quotaHistoryFor(snapshot: ProviderSnapshot, window: QuotaWindow) {
  return snapshot.quotaHistory.filter((sample) => sample.windowId === window.id);
}

function QuotaMetric(props: { snapshot: ProviderSnapshot; quota: QuotaWindow }) {
  const { t, dateTime, language } = useI18n();
  const forecast = () => forecastQuota(props.quota, quotaHistoryFor(props.snapshot, props.quota));
  const windowLabel = () => formatQuotaWindowLabel(props.quota.label, language());

  return (
    <div class="quota-metric" data-tone={quotaTone(props.quota)}>
      <div class="metric-row">
        <div class="metric-label-stack">
          <span class="metric-label">{windowLabel()}</span>
          <span class="metric-used">{t('used', { value: used(props.quota).toFixed(0) })}</span>
        </div>
        <div class="metric-values">
          <strong>{remaining(props.quota).toFixed(0)}%</strong>
          <span>{t('left')}</span>
        </div>
      </div>
      <div
        class="meter"
        aria-label={language() === 'zh-TW'
          ? `${windowLabel()} 剩餘 ${remaining(props.quota).toFixed(0)}%`
          : `${windowLabel()} ${remaining(props.quota).toFixed(0)} percent remaining`}>
        <span style={{ width: `${used(props.quota)}%` }} />
      </div>
      <div class="provider-meta">
        <Show when={props.quota.resetAt}>
          <p class="muted">{t('reset', { time: dateTime(props.quota.resetAt!) })}</p>
        </Show>
        <Show when={forecast().willDepleteBeforeReset && forecast().projectedDepletionAt}>
          <p
            class="forecast-warning"
            title={language() === 'zh-TW'
              ? '依近期 Usage 推估，不是 Provider 提供的截止時間。'
              : 'CYBOARD estimate based on recent usage samples; this is not a provider-supplied reset or cutoff time.'}>
            {language() === 'zh-TW' ? '依目前速度 · 可能用完 ' : 'At current pace · may run out '}
            {dateTime(forecast().projectedDepletionAt!)}
          </p>
        </Show>
      </div>
    </div>
  );
}

function ProviderCard(props: { snapshot: ProviderSnapshot }) {
  const { t, dateTime, language } = useI18n();
  const evidence = () => providerEvidence(props.snapshot);
  return (
    <article
      class="provider-card"
      data-freshness={props.snapshot.freshness}
      aria-label={`${props.snapshot.displayName} ${language() === 'zh-TW' ? '額度' : 'quota'}`}>
      <div class="provider-card__header">
        <div>
          <div class="provider-heading-meta">
            <p class="eyebrow">{props.snapshot.provider.toUpperCase()}</p>
            <span class={`provider-evidence provider-evidence--${evidence().toLowerCase()}`}>{evidence()}</span>
          </div>
          <h2>{props.snapshot.displayName}</h2>
        </div>
        <span
          class={`status-dot status-dot--${props.snapshot.freshness}`}
          aria-label={freshnessText(props.snapshot.freshness, language())}
        />
      </div>
      <Show
        when={props.snapshot.quota.length > 0}
        fallback={
          <div class="provider-card__empty">
            <span>{t('noQuotaSignal')}</span>
            <p class="muted">{t('waitingQuota')}</p>
          </div>
        }>
        <div class="quota-window-list">
          <For each={props.snapshot.quota}>{(quota) => <QuotaMetric snapshot={props.snapshot} quota={quota} />}</For>
        </div>
      </Show>
      <Show when={props.snapshot.issue}>
        {(issue) => (
          <div class="issue-block" role="status" aria-live="polite">
            <p class="issue">{providerIssueText(issue().code, issue().message, language())}</p>
            <Show when={issue().retryAt}>
              <p class="muted issue-retry">{t('retryAfter', { time: dateTime(issue().retryAt!) })}</p>
            </Show>
          </div>
        )}
      </Show>
    </article>
  );
}

function ProviderSkeleton() {
  return (
    <article class="provider-card provider-card--skeleton" aria-hidden="true">
      <div class="skeleton-line skeleton-line--eyebrow" />
      <div class="skeleton-line skeleton-line--title" />
      <div class="skeleton-metric">
        <div class="skeleton-line skeleton-line--label" />
        <div class="skeleton-line skeleton-line--value" />
      </div>
      <div class="skeleton-meter" />
      <div class="skeleton-line skeleton-line--meta" />
    </article>
  );
}

function OperatorFallback(props: { ready: number; total: number; disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <div class="operator-core operator-core--disabled" aria-label={props.disabled ? t('operatorDisabled') : t('operatorLoading')}>
      <div class="core-ring core-ring--outer" />
      <div class="core-ring core-ring--inner" />
      <div class="core-diamond"><span>CY</span></div>
      <p>{t('providersReady', { ready: props.ready, total: props.total })}</p>
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = createSignal(loadSettings());
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [forceSyncing, setForceSyncing] = createSignal(false);
  const [operatorTransientState, setOperatorTransientState] = createSignal<OperatorTransientState>(null);
  const [operatorSimulationState, setOperatorSimulationState] = createSignal<OperatorRuntimeState | null>(null);
  const [operatorAttentionSimulation, setOperatorAttentionSimulation] = createSignal<Nyx2DAttentionTarget | null>(null);
  const [operatorMotionTuning, setOperatorMotionTuning] = createSignal<Nyx2DMotionTuning>({ ...NYX_2D_TEST_TUNING });
  const [sessionCloseouts, setSessionCloseouts] = createSignal(emptySessionCloseoutState());
  const observeSnapshotBatch = (next: ProviderSnapshot[]) => {
    setSessionCloseouts((previous) => observeSessionCloseouts(previous, next));
    return next;
  };
  const [snapshots, { refetch, mutate }] = createResource(async () => observeSnapshotBatch(await client.refresh()));
  let settingsButton: HTMLButtonElement | undefined;
  let operatorSuccessTimer: number | undefined;

  const visibleSnapshots = () =>
    (snapshots() ?? []).filter((snapshot) => settings().enabledProviders.includes(snapshot.provider));
  const activeSessions = () =>
    visibleSnapshots().flatMap((snapshot) => snapshot.sessions).filter((session) => session.status === 'active');
  const readyProviders = () => visibleSnapshots().filter(isProviderReady).length;
  const providerCount = () => settings().enabledProviders.length;
  const readinessPercent = () => providerCount() > 0 ? (readyProviders() / providerCount()) * 100 : 0;
  const operatorPanels = () => buildOperatorProviderPanels(visibleSnapshots());
  const initialLoading = () => snapshots.loading && visibleSnapshots().length === 0;
  const systemBrief = createMemo(() => buildStatusIntelligence(visibleSnapshots(), new Date(), settings().language));
  const operatorBriefHeadline = () => initialLoading()
    ? settings().language === 'zh-TW' ? '正在分析 Provider' : 'Evaluating provider signals'
    : systemBrief().headline;
  const operatorBriefTone = () => initialLoading() ? 'nominal' as const : systemBrief().tone;

  onMount(() => {
    void readLaunchAtLogin()
      .then((enabled) => setSettings((current) => ({ ...current, launchAtLogin: enabled })))
      .catch(() => undefined);
  });

  onCleanup(() => {
    if (operatorSuccessTimer !== undefined) window.clearTimeout(operatorSuccessTimer);
  });

  createEffect(() => {
    const intervalMs = settings().autoRefreshSeconds * 1000;
    const timer = window.setInterval(() => void refetch(), intervalMs);
    onCleanup(() => window.clearInterval(timer));
  });

  createEffect(() => {
    const current = visibleSnapshots();
    if (current.length) void notifyQuotaAlerts(current, settings()).catch(() => undefined);
  });

  createEffect(() => {
    if (!settings().operatorTestControlsEnabled || settings().operatorMode !== 'female') {
      setOperatorSimulationState(null);
      setOperatorAttentionSimulation(null);
    }
  });

  const closeSettings = () => {
    setSettingsOpen(false);
    queueMicrotask(() => settingsButton?.focus());
  };

  const toggleSettings = () => {
    if (settingsOpen()) closeSettings();
    else setSettingsOpen(true);
  };

  const forceRefresh = async () => {
    if (forceSyncing()) return;
    if (operatorSuccessTimer !== undefined) window.clearTimeout(operatorSuccessTimer);
    setOperatorTransientState('observing');
    setForceSyncing(true);
    try {
      const refreshed = await client.refresh(undefined, true);
      observeSnapshotBatch(refreshed);
      mutate(refreshed);
      const visible = refreshed.filter((snapshot) => settings().enabledProviders.includes(snapshot.provider));
      const allReady = visible.length > 0 && visible.every(isProviderReady);
      if (allReady) {
        setOperatorTransientState('success');
        operatorSuccessTimer = window.setTimeout(() => {
          setOperatorTransientState(null);
          operatorSuccessTimer = undefined;
        }, 1800);
      } else {
        setOperatorTransientState(null);
      }
    } catch {
      setOperatorTransientState(null);
    } finally {
      setForceSyncing(false);
    }
  };

  const updateSettings = (next: AppSettings) => {
    const sanitized = sanitizeSettings(next);
    const previous = settings();
    setSettings(sanitized);
    saveSettings(sanitized);
    if (previous.launchAtLogin !== sanitized.launchAtLogin) {
      void setLaunchAtLogin(sanitized.launchAtLogin).catch(() => {
        const rollback = { ...settings(), launchAtLogin: previous.launchAtLogin };
        setSettings(rollback);
        saveSettings(rollback);
      });
    }
  };

  const updateMotionTuning = (key: Nyx2DMotionTuningKey, value: number) => {
    setOperatorMotionTuning((current) => ({
      ...current,
      [key]: clampNyx2DTuningValue(key, value),
    }));
  };

  const resetMotionTuning = () => setOperatorMotionTuning({ ...NYX_2D_TEST_TUNING });

  const Dashboard = () => {
    const { t, language } = useI18n();
    const monitorStatus = () => {
      if (forceSyncing()) return language() === 'zh-TW' ? '同步 Provider' : 'SYNCING PROVIDERS';
      if (initialLoading()) return t('connecting');
      return t('localMonitor');
    };

    return (
      <main class="shell" lang={language() === 'zh-TW' ? 'zh-Hant-TW' : 'en'}>
        <header class="topbar" data-syncing={snapshots.loading || forceSyncing()}>
          <div class="brand">
            <img src="/brand/cyboard-mark.svg" alt="" />
            <div>
              <p class="eyebrow">{language() === 'zh-TW' ? 'AI 指揮中心' : 'AI COMMAND CENTER'}</p>
              <h1>CYBOARD<span>_</span></h1>
            </div>
          </div>
          <div class="topbar-actions">
            <span class="topbar-state"><span class="topbar-state__dot" />{monitorStatus()}</span>
            <button
              ref={(element) => { settingsButton = element; }}
              class="ghost-button"
              aria-expanded={settingsOpen()}
              aria-controls="cyboard-settings"
              onClick={toggleSettings}>
              {t('settings')}
            </button>
            <button class="ghost-button ghost-button--accent" onClick={() => void forceRefresh()} disabled={snapshots.loading || forceSyncing()}>
              {snapshots.loading || forceSyncing() ? t('syncing') : t('refresh')}
            </button>
            <span class="sr-only" aria-live="polite">
              {forceSyncing()
                ? t('refreshingQuotas')
                : operatorTransientState() === 'success'
                  ? language() === 'zh-TW' ? 'Provider 更新完成' : 'Provider refresh completed'
                  : ''}
            </span>
          </div>
        </header>

        <Show when={settingsOpen()}>
          <div class="settings-layer">
            <button class="settings-scrim" aria-label={t('closeSettings')} onClick={closeSettings} />
            <SettingsPanel settings={settings()} onChange={updateSettings} onClose={closeSettings} />
          </div>
        </Show>

        <section class="hero-grid">
          <Show
            when={settings().operatorMode !== 'off'}
            fallback={<OperatorFallback ready={readyProviders()} total={providerCount()} disabled />}>
            <OperatorStage
              mode={settings().operatorMode as 'female' | 'male'}
              readyProviders={readyProviders()}
              totalProviders={providerCount()}
              activeAgents={activeSessions().length}
              providers={operatorPanels()}
              transientState={forceSyncing() ? 'observing' : operatorTransientState()}
              stateOverride={settings().operatorMode === 'female' ? operatorSimulationState() : null}
              attentionOverride={settings().operatorTestControlsEnabled && settings().operatorMode === 'female' ? operatorAttentionSimulation() : null}
              motionTuning={settings().operatorTestControlsEnabled && settings().operatorMode === 'female' ? operatorMotionTuning() : null}
              briefHeadline={operatorBriefHeadline()}
              briefTone={operatorBriefTone()}
              assistantIntelligence={initialLoading() ? undefined : systemBrief()}
            />
          </Show>
          <div class="hero-side">
            <OperatorBrief intelligence={systemBrief()} loading={initialLoading()} />
            <div class="agent-summary">
              <div class="agent-summary__header">
                <p class="eyebrow">{t('activeAgents')}</p>
                <span class="agent-summary__ready">{readyProviders()}/{providerCount()} {language() === 'zh-TW' ? '就緒' : 'READY'}</span>
              </div>
              <div class="agent-summary__value">
                <strong>{activeSessions().length}</strong>
                <span>{activeSessions().length === 1 ? t('sessionRunning') : t('sessionsRunning')}</span>
              </div>
              <div
                class="readiness-rail"
                aria-label={language() === 'zh-TW'
                  ? `已啟用 Provider ${readinessPercent().toFixed(0)}% 就緒`
                  : `${readinessPercent().toFixed(0)} percent of enabled providers ready`}>
                <span style={{ width: `${readinessPercent()}%` }} />
              </div>
              <small>{t('providerHealth')}</small>
            </div>
            <CapacityRouting snapshots={visibleSnapshots()} />
          </div>
        </section>

        <Show when={settings().operatorTestControlsEnabled && settings().operatorMode === 'female'}>
          <OperatorSimulator
            value={operatorSimulationState()}
            attentionValue={operatorAttentionSimulation()}
            tuning={operatorMotionTuning()}
            onChange={setOperatorSimulationState}
            onAttentionChange={setOperatorAttentionSimulation}
            onTuningChange={updateMotionTuning}
            onResetTuning={resetMotionTuning}
          />
        </Show>

        <Show when={snapshots.error}>
          <section class="system-error" role="alert">{t('noProviderBridge')}</section>
        </Show>

        <div class="section-heading">
          <div>
            <p class="eyebrow">{t('resourceMatrix')}</p>
            <h2>{t('providerQuota')}</h2>
          </div>
          <span class="section-counter">{initialLoading() ? t('syncing') : t('providersCount', { count: visibleSnapshots().length })}</span>
        </div>
        <section class="provider-grid" aria-busy={snapshots.loading || forceSyncing()} data-count={providerCount()}>
          <Show
            when={!initialLoading()}
            fallback={<For each={Array.from({ length: providerCount() })}>{() => <ProviderSkeleton />}</For>}>
            <For each={visibleSnapshots()}>{(snapshot) => <ProviderCard snapshot={snapshot} />}</For>
          </Show>
        </section>

        <QuotaTrend snapshots={visibleSnapshots()} />
        <UsageActivity snapshots={visibleSnapshots()} />

        <section class="session-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">{t('liveOperations')}</p>
              <h2>{t('agentSessions')}</h2>
            </div>
            <span class="section-counter">{t('activeCount', { count: activeSessions().length })}</span>
          </div>
          <Show
            when={activeSessions().length > 0}
            fallback={
              <div class="session-empty-state">
                <span class="standby-pulse" />
                <div>
                  <strong>{t('allAgentsStandby')}</strong>
                  <p class="muted">{t('sessionsAutoAppear')}</p>
                </div>
              </div>
            }>
            <div class="session-list">
              <For each={activeSessions()}>
                {(session) => (
                  <div class="session-row">
                    <span class="live-dot" />
                    <strong>{session.provider.toUpperCase()}</strong>
                    <span>{session.project ?? (language() === 'zh-TW' ? '未知 Project' : 'Unknown project')}</span>
                    <small>ACTIVE</small>
                  </div>
                )}
              </For>
            </div>
          </Show>
          <SessionCloseouts closeouts={sessionCloseouts().closeouts} />
        </section>
      </main>
    );
  };

  return (
    <I18nProvider language={settings().language}>
      <Dashboard />
    </I18nProvider>
  );
}
