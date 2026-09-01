import { For, Show, createEffect, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import type { ProviderSnapshot, QuotaWindow } from '../domain/types';
import { forecastQuota } from '../domain/forecast';
import { isProviderReady } from '../domain/providerStatus';
import { notifyQuotaAlerts } from '../notifications/service';
import { TauriProviderClient } from '../providers/client';
import { readLaunchAtLogin, setLaunchAtLogin } from '../settings/autostart';
import { loadSettings, saveSettings, sanitizeSettings, type AppSettings } from '../settings/settings';
import QuotaTrend from './QuotaTrend';
import SettingsPanel from './SettingsPanel';

const client = new TauriProviderClient();

function used(window: QuotaWindow) {
  return Math.max(0, Math.min(100, window.usedPercent));
}

function remaining(window: QuotaWindow) {
  return 100 - used(window);
}

function quotaHistoryFor(snapshot: ProviderSnapshot, window: QuotaWindow) {
  return snapshot.quotaHistory.filter((sample) => sample.windowId === window.id);
}

function QuotaMetric(props: { snapshot: ProviderSnapshot; quota: QuotaWindow }) {
  const forecast = () => forecastQuota(props.quota, quotaHistoryFor(props.snapshot, props.quota));

  return (
    <div class="quota-metric">
      <div class="metric-row">
        <span class="metric-label">{props.quota.label}</span>
        <div class="metric-values">
          <strong>{used(props.quota).toFixed(0)}%</strong>
          <span>used · {remaining(props.quota).toFixed(0)}% left</span>
        </div>
      </div>
      <div class="meter" aria-label={`${props.quota.label} ${used(props.quota).toFixed(0)} percent used`}>
        <span style={{ width: `${used(props.quota)}%` }} />
      </div>
      <div class="provider-meta">
        <Show when={props.quota.resetAt}>
          <p class="muted">Reset {new Date(props.quota.resetAt!).toLocaleString()}</p>
        </Show>
        <Show when={forecast().willDepleteBeforeReset && forecast().projectedDepletionAt}>
          <p class="forecast-warning">Projected depletion {new Date(forecast().projectedDepletionAt!).toLocaleString()}</p>
        </Show>
      </div>
    </div>
  );
}

function ProviderCard(props: { snapshot: ProviderSnapshot }) {
  return (
    <article class="provider-card">
      <div class="provider-card__header">
        <div>
          <p class="eyebrow">{props.snapshot.provider.toUpperCase()}</p>
          <h2>{props.snapshot.displayName}</h2>
        </div>
        <span class={`status-dot status-dot--${props.snapshot.freshness}`} aria-label={props.snapshot.freshness} />
      </div>
      <Show when={props.snapshot.quota.length > 0} fallback={<p class="muted provider-card__empty">Quota unavailable</p>}>
        <div class="quota-window-list">
          <For each={props.snapshot.quota}>{(quota) => <QuotaMetric snapshot={props.snapshot} quota={quota} />}</For>
        </div>
      </Show>
      <Show when={props.snapshot.issue}>
        {(issue) => (
          <div class="issue-block">
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

export default function App() {
  const [settings, setSettings] = createSignal(loadSettings());
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [snapshots, { refetch }] = createResource(() => client.refresh());
  const activeSessions = () => snapshots()?.flatMap((snapshot) => snapshot.sessions).filter((session) => session.status === 'active') ?? [];
  const readyProviders = () => snapshots()?.filter(isProviderReady).length ?? 0;

  onMount(() => {
    void readLaunchAtLogin()
      .then((enabled) => setSettings((current) => ({ ...current, launchAtLogin: enabled })))
      .catch(() => undefined);
  });

  createEffect(() => {
    const intervalMs = settings().autoRefreshSeconds * 1000;
    const timer = window.setInterval(() => void refetch(), intervalMs);
    onCleanup(() => window.clearInterval(timer));
  });

  createEffect(() => {
    const current = snapshots();
    if (current) void notifyQuotaAlerts(current, settings()).catch(() => undefined);
  });

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

  return (
    <main class="shell">
      <header class="topbar">
        <div class="brand">
          <img src="/brand/cyboard-mark.svg" alt="" />
          <div>
            <p class="eyebrow">AI COMMAND CENTER</p>
            <h1>CYBOARD<span>_</span></h1>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="ghost-button" onClick={() => setSettingsOpen((open) => !open)}>
            SETTINGS
          </button>
          <button class="ghost-button" onClick={() => void refetch()} disabled={snapshots.loading}>
            {snapshots.loading ? 'SYNCING' : 'REFRESH'}
          </button>
        </div>
      </header>

      <Show when={settingsOpen()}>
        <SettingsPanel settings={settings()} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />
      </Show>

      <section class="hero-grid">
        <div class="operator-core" aria-label="CYBOARD operator core">
          <div class="core-ring core-ring--outer" />
          <div class="core-ring core-ring--inner" />
          <div class="core-diamond"><span>CY</span></div>
          <p>{snapshots.loading ? 'SYNCING PROVIDERS' : `${readyProviders()}/3 PROVIDERS READY`}</p>
        </div>
        <div class="agent-summary">
          <p class="eyebrow">ACTIVE AGENTS</p>
          <strong>{activeSessions().length}</strong>
          <span>{activeSessions().length === 1 ? 'session' : 'sessions'} running</span>
        </div>
      </section>

      <Show when={snapshots.error}>
        <section class="system-error">Native provider bridge unavailable. Launch CYBOARD through the Tauri desktop shell.</section>
      </Show>

      <section class="provider-grid" aria-busy={snapshots.loading}>
        <For each={snapshots() ?? []}>{(snapshot) => <ProviderCard snapshot={snapshot} />}</For>
      </section>

      <QuotaTrend snapshots={snapshots() ?? []} />

      <section class="session-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">LIVE OPERATIONS</p>
            <h2>Agent Sessions</h2>
          </div>
        </div>
        <Show when={activeSessions().length > 0} fallback={<p class="muted session-empty">All agents standing by.</p>}>
          <For each={activeSessions()}>
            {(session) => (
              <div class="session-row">
                <span class="live-dot" />
                <strong>{session.provider.toUpperCase()}</strong>
                <span>{session.project ?? 'Unknown project'}</span>
              </div>
            )}
          </For>
        </Show>
      </section>
    </main>
  );
}
