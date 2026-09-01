import { For, Show, createEffect, createResource, onCleanup } from 'solid-js';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { ProviderSnapshot } from '../domain/types';
import { TauriProviderClient } from '../providers/client';
import { loadSettings } from '../settings/settings';

const client = new TauriProviderClient();

function remaining(snapshot: ProviderSnapshot) {
  const primary = snapshot.quota[0];
  return primary ? Math.max(0, Math.min(100, 100 - primary.usedPercent)) : undefined;
}

async function openDashboard() {
  const main = await WebviewWindow.getByLabel('main');
  await main?.show();
  await main?.setFocus();
  const compact = await WebviewWindow.getByLabel('compact');
  await compact?.hide();
}

export default function CompactApp() {
  const settings = loadSettings();
  const [snapshots, { refetch }] = createResource(() => client.refresh());
  const activeCount = () => snapshots()?.reduce((count, snapshot) => count + snapshot.sessions.filter((session) => session.status === 'active').length, 0) ?? 0;

  createEffect(() => {
    const timer = window.setInterval(() => void refetch(), settings.autoRefreshSeconds * 1000);
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
        <For each={snapshots() ?? []}>
          {(snapshot) => (
            <article class="compact-provider">
              <div class="compact-provider__label">
                <strong>{snapshot.displayName}</strong>
                <span class={`status-dot status-dot--${snapshot.freshness}`} />
              </div>
              <Show when={remaining(snapshot) !== undefined} fallback={<span class="compact-unavailable">N/A</span>}>
                <strong class="compact-percent">{remaining(snapshot)!.toFixed(0)}%</strong>
              </Show>
              <Show when={snapshot.quota[0]}>
                {(quota) => (
                  <div class="compact-meter" aria-label={`${remaining(snapshot)?.toFixed(0)} percent remaining`}>
                    <span style={{ width: `${remaining(snapshot)}%` }} />
                  </div>
                )}
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
