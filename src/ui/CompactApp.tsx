import { For, Show, createEffect, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { QuotaWindow } from '../domain/types';
import { TauriProviderClient } from '../providers/client';
import { loadSettings } from '../settings/settings';

const client = new TauriProviderClient();

function used(window: QuotaWindow) {
  return Math.max(0, Math.min(100, window.usedPercent));
}

function remaining(window: QuotaWindow) {
  return 100 - used(window);
}

async function openDashboard() {
  const main = await WebviewWindow.getByLabel('main');
  await main?.show();
  await main?.setFocus();
  const compact = await WebviewWindow.getByLabel('compact');
  await compact?.hide();
}

export default function CompactApp() {
  const [settings, setSettings] = createSignal(loadSettings());
  const [snapshots, { refetch }] = createResource(() => client.refresh());
  const visibleSnapshots = () =>
    (snapshots() ?? []).filter((snapshot) => settings().enabledProviders.includes(snapshot.provider));
  const activeCount = () =>
    visibleSnapshots().reduce(
      (count, snapshot) => count + snapshot.sessions.filter((session) => session.status === 'active').length,
      0,
    );

  onMount(() => {
    const syncSettings = () => setSettings(loadSettings());
    window.addEventListener('storage', syncSettings);
    window.addEventListener('focus', syncSettings);
    onCleanup(() => {
      window.removeEventListener('storage', syncSettings);
      window.removeEventListener('focus', syncSettings);
    });
  });

  createEffect(() => {
    const timer = window.setInterval(() => void refetch(), settings().autoRefreshSeconds * 1000);
    onCleanup(() => window.clearInterval(timer));
  });

  return (
    <main class="compact-shell">
      <header class="compact-header">
        <div class="brand">
          <img src="/brand/cyboard-mark.svg" alt="" />
          <div>
            <p class="eyebrow">COMMAND LINK</p>
            <h1>CYBOARD<span>_</span></h1>
          </div>
        </div>
        <span class="compact-online">● ONLINE</span>
      </header>

      <section class="compact-providers" aria-busy={snapshots.loading}>
        <For each={visibleSnapshots()}>
          {(snapshot) => (
            <article class="compact-provider">
              <div class="compact-provider__label">
                <strong>{snapshot.displayName}</strong>
                <span class={`status-dot status-dot--${snapshot.freshness}`} />
              </div>
              <Show when={snapshot.quota.length > 0} fallback={<span class="compact-unavailable">N/A</span>}>
                <div class="compact-window-list">
                  <For each={snapshot.quota.slice(0, 4)}>
                    {(quota) => (
                      <div class="compact-window">
                        <span>{quota.label}</span>
                        <strong>{remaining(quota).toFixed(0)}%</strong>
                        <small>left</small>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </article>
          )}
        </For>
      </section>

      <section class="compact-activity">
        <p class="eyebrow">ACTIVE AGENTS</p>
        <div><strong>{activeCount()}</strong><span>{activeCount() === 1 ? 'session running' : 'sessions running'}</span></div>
      </section>

      <footer class="compact-footer">
        <button class="ghost-button" onClick={() => void refetch()} disabled={snapshots.loading}>
          {snapshots.loading ? 'SYNCING' : 'REFRESH'}
        </button>
        <button class="primary-button" onClick={() => void openDashboard()}>OPEN DASHBOARD</button>
      </footer>
    </main>
  );
}
