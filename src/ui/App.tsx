import { For, Show, createEffect, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import { providerEvidence } from '../domain/providerEvidence';
import type { ProviderSnapshot, QuotaWindow } from '../domain/types';
import { forecastQuota } from '../domain/forecast';
import { isProviderReady } from '../domain/providerStatus';
import { notifyQuotaAlerts } from '../notifications/service';
import { TauriProviderClient } from '../providers/client';
import { readLaunchAtLogin, setLaunchAtLogin } from '../settings/autostart';
import { loadSettings, saveSettings, sanitizeSettings, type AppSettings } from '../settings/settings';
import CapacityRouting from './CapacityRouting';
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
import SettingsPanel from './SettingsPanel';
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
  const forecast = () => forecastQuota(props.quota, quotaHistoryFor(props.snapshot, props.quota));

  return (
    <div class="quota-metric" data-tone={quotaTone(props.quota)}>
      <div class="metric-row">
        <div class="metric-label-stack">
          <span class="metric-label">{props.quota.label}</span>
          <span class="metric-used">{used(props.quota).toFixed(0)}% used</span>
        </div>
        <div class="metric-values">
          <strong>{remaining(props.quota).toFixed(0)}%</strong>
          <span>LEFT</span>
        </div>
      </div>
      <div class="meter" aria-label={`${props.quota.label} ${remaining(props.quota).toFixed(0)} percent remaining`}>
        <span style={{ width: `${used(props.quota)}%` }} />
      </div>
      <div class="provider-meta">
        <Show when={props.quota.resetAt}>
          <p class="muted">Reset {new Date(props.quota.resetAt!).toLocaleString()}</p>
        </Show>
        <Show when={forecast().willDepleteBeforeReset && forecast().projectedDepletionAt}>
          <p
            class="forecast-warning"
            title="CYBOARD estimate based on recent usage samples; this is not a provider-supplied reset or cutoff time.">
            At current pace · may run out {new Date(forecast().projectedDepletionAt!).toLocaleString()}
          </p>
        </Show>
      </div>
    </div>
  );
}

function ProviderCard(props: { snapshot: ProviderSnapshot }) {
  const evidence = () => providerEvidence(props.snapshot);
  return (
    <article class="provider-card" data-freshness={props.snapshot.freshness} aria-label={`${props.snapshot.displayName} quota`}>
      <div class="provider-card__header">
        <div>
          <div class="provider-heading-meta">
            <p class="eyebrow">{props.snapshot.provider.toUpperCase()}</p>
            <span class={`provider-evidence provider-evidence--${evidence().toLowerCase()}`}>{evidence()}</span>
          </div>
          <h2>{props.snapshot.displayName}</h2>
        </div>
        <span class={`status-dot status-dot--${props.snapshot.freshness}`} aria-label={props.snapshot.freshness} />
      </div>
      <Show
        when={props.snapshot.quota.length > 0}
        fallback={
          <div class="provider-card__empty">
            <span>NO QUOTA SIGNAL</span>
            <p class="muted">Waiting for a usable quota snapshot.</p>
          </div>
        }>
        <div class="quota-window-list">
          <For each={props.snapshot.quota}>{(quota) => <QuotaMetric snapshot={props.snapshot} quota={quota} />}</For>
        </div>
      </Show>
      <Show when={props.snapshot.issue}>
        {(issue) => (
          <div class="issue-block" role="status" aria-live="polite">
            <p class="issue">{issue().message}</p>
            <Show when={issue().retryAt}>
              <p class="muted issue-retry">Retry after {new Date(issue().retryAt!).toLocaleString()}</p>
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
  return (
    <div class="operator-core operator-core--disabled" aria-label={props.disabled ? 'CYBOARD operator disabled' : 'CYBOARD operator loading'}>
      <div class="core-ring core-ring--outer" />
      <div class="core-ring core-ring--inner" />
      <div class="core-diamond"><span>CY</span></div>
      <p>{props.ready}/{props.total} PROVIDERS READY</p>
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = createSignal(loadSettings());
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [forceSyncing, setForceSyncing] = createSignal(false);
  const [operatorTransientState, setOperatorTransientState] = createSignal<OperatorTransientState>(null);
  const [operatorSimulationState, setOperatorSimulationState] = createSignal<OperatorRuntimeState | null>(null);
  const [operatorMotionTuning, setOperatorMotionTuning] = createSignal<Nyx2DMotionTuning>({ ...NYX_2D_TEST_TUNING });
  const [snapshots, { refetch, mutate }] = createResource(() => client.refresh());
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
  const monitorStatus = () => {
    if (forceSyncing()) return 'SYNCING PROVIDERS';
    if (initialLoading()) return 'CONNECTING';
    return 'LOCAL MONITOR';
  };

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

  return (
    <main class="shell">
      <header class="topbar" data-syncing={snapshots.loading || forceSyncing()}>
        <div class="brand">
          <img src="/brand/cyboard-mark.svg" alt="" />
          <div>
            <p class="eyebrow">AI COMMAND CENTER</p>
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
            SETTINGS
          </button>
          <button class="ghost-button ghost-button--accent" onClick={() => void forceRefresh()} disabled={snapshots.loading || forceSyncing()}>
            {snapshots.loading || forceSyncing() ? 'SYNCING' : 'REFRESH'}
          </button>
          <span class="sr-only" aria-live="polite">
            {forceSyncing() ? 'Refreshing provider quotas' : operatorTransientState() === 'success' ? 'Provider refresh completed' : ''}
          </span>
        </div>
      </header>

      <Show when={settingsOpen()}>
        <div class="settings-layer">
          <button class="settings-scrim" aria-label="Close settings" onClick={closeSettings} />
          <SettingsPanel settings={settings()} onChange={updateSettings} onClose={closeSettings} />
        </div>
      </Show>

      <section class="hero-grid">
        <Show
          when={settings().operatorMode !== 'off'}
          fallback={<OperatorFallback ready={readyProviders()} total={providerCount()} disabled />}
        >
          <OperatorStage
            mode={settings().operatorMode as 'female' | 'male'}
            readyProviders={readyProviders()}
            totalProviders={providerCount()}
            activeAgents={activeSessions().length}
            providers={operatorPanels()}
            transientState={forceSyncing() ? 'observing' : operatorTransientState()}
            stateOverride={settings().operatorMode === 'female' ? operatorSimulationState() : null}
            motionTuning={
              settings().operatorTestControlsEnabled && settings().operatorMode === 'female'
                ? operatorMotionTuning()
                : null
            }
          />
        </Show>
        <div class="hero-side">
          <div class="agent-summary">
            <div class="agent-summary__header">
              <p class="eyebrow">ACTIVE AGENTS</p>
              <span class="agent-summary__ready">{readyProviders()}/{providerCount()} READY</span>
            </div>
            <div class="agent-summary__value">
              <strong>{activeSessions().length}</strong>
              <span>{activeSessions().length === 1 ? 'session running' : 'sessions running'}</span>
            </div>
            <div class="readiness-rail" aria-label={`${readinessPercent().toFixed(0)} percent of enabled providers ready`}>
              <span style={{ width: `${readinessPercent()}%` }} />
            </div>
            <small>Provider health and live session state</small>
          </div>
          <CapacityRouting snapshots={visibleSnapshots()} />
        </div>
      </section>

      <Show when={settings().operatorTestControlsEnabled && settings().operatorMode === 'female'}>
        <OperatorSimulator
          value={operatorSimulationState()}
          tuning={operatorMotionTuning()}
          onChange={setOperatorSimulationState}
          onTuningChange={updateMotionTuning}
          onResetTuning={resetMotionTuning}
        />
      </Show>

      <Show when={snapshots.error}>
        <section class="system-error" role="alert">Native provider bridge unavailable. Launch CYBOARD through the Tauri desktop shell.</section>
      </Show>

      <div class="section-heading">
        <div>
          <p class="eyebrow">RESOURCE MATRIX</p>
          <h2>Provider Quota</h2>
        </div>
        <span class="section-counter">{initialLoading() ? 'SYNCING' : `${visibleSnapshots().length} PROVIDERS`}</span>
      </div>
      <section class="provider-grid" aria-busy={snapshots.loading || forceSyncing()} data-count={providerCount()}>
        <Show
          when={!initialLoading()}
          fallback={<For each={Array.from({ length: providerCount() })}>{() => <ProviderSkeleton />}</For>}>
          <For each={visibleSnapshots()}>{(snapshot) => <ProviderCard snapshot={snapshot} />}</For>
        </Show>
      </section>

      <QuotaTrend snapshots={visibleSnapshots()} />

      <section class="session-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">LIVE OPERATIONS</p>
            <h2>Agent Sessions</h2>
          </div>
          <span class="section-counter">{activeSessions().length} ACTIVE</span>
        </div>
        <Show
          when={activeSessions().length > 0}
          fallback={
            <div class="session-empty-state">
              <span class="standby-pulse" />
              <div>
                <strong>All agents standing by</strong>
                <p class="muted">Live coding sessions will appear here automatically.</p>
              </div>
            </div>
          }>
          <div class="session-list">
            <For each={activeSessions()}>
              {(session) => (
                <div class="session-row">
                  <span class="live-dot" />
                  <strong>{session.provider.toUpperCase()}</strong>
                  <span>{session.project ?? 'Unknown project'}</span>
                  <small>ACTIVE</small>
                </div>
              )}
            </For>
          </div>
        </Show>
      </section>
    </main>
  );
}
