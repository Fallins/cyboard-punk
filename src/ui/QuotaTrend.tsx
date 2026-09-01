import { For, Show } from 'solid-js';
import type { ProviderSnapshot, QuotaSample, QuotaWindow } from '../domain/types';

export function trendPoints(samples: QuotaSample[], width = 240, height = 46) {
  const relevant = samples
    .map((sample) => ({ sample, time: new Date(sample.at).getTime() }))
    .filter((item) => Number.isFinite(item.time) && Number.isFinite(item.sample.usedPercent))
    .sort((a, b) => a.time - b.time)
    .slice(-24);

  if (relevant.length < 2) return '';

  const firstTime = relevant[0]!.time;
  const lastTime = relevant.at(-1)!.time;
  const span = Math.max(1, lastTime - firstTime);

  return relevant
    .map(({ sample, time }) => {
      const rawX = ((time - firstTime) / span) * width;
      const used = Math.max(0, Math.min(100, sample.usedPercent));
      const rawY = height - (used / 100) * height;
      const x = Math.max(0, Math.min(width, rawX));
      const y = Math.max(0, Math.min(height, rawY));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function mostConstrainedQuota(quota: QuotaWindow[]) {
  return quota.reduce<QuotaWindow | undefined>(
    (mostConstrained, window) =>
      !mostConstrained || window.usedPercent > mostConstrained.usedPercent ? window : mostConstrained,
    undefined,
  );
}

export default function QuotaTrend(props: { snapshots: ProviderSnapshot[] }) {
  const series = () =>
    props.snapshots
      .map((snapshot) => {
        const tracked = mostConstrainedQuota(snapshot.quota);
        const samples = tracked ? snapshot.quotaHistory.filter((sample) => sample.windowId === tracked.id) : [];
        return {
          provider: snapshot.provider,
          displayName: snapshot.displayName,
          windowLabel: tracked?.label,
          samples,
        };
      })
      .filter((item) => item.samples.length > 1);

  return (
    <section class="trend-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">BURN RATE</p>
          <h2>Quota Trend</h2>
        </div>
        <span class="section-counter">LAST 24 SAMPLES</span>
      </div>
      <Show when={series().length > 0} fallback={<p class="muted trend-empty">Trend data builds while CYBOARD is running.</p>}>
        <div class="trend-grid">
          <For each={series()}>
            {(item) => {
              const latestUsed = () => Math.max(0, Math.min(100, item.samples.at(-1)?.usedPercent ?? 0));
              return (
                <article class="trend-series">
                  <div class="trend-series__heading">
                    <div>
                      <strong>{item.displayName}</strong>
                      <small>{item.windowLabel ?? 'quota'}</small>
                    </div>
                    <span>{(100 - latestUsed()).toFixed(0)}% left</span>
                  </div>
                  <svg
                    viewBox="0 0 240 46"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={`${item.displayName} quota usage trend`}>
                    <line x1="0" y1="11.5" x2="240" y2="11.5" />
                    <line x1="0" y1="23" x2="240" y2="23" />
                    <line x1="0" y1="34.5" x2="240" y2="34.5" />
                    <polyline points={trendPoints(item.samples)} vector-effect="non-scaling-stroke" />
                  </svg>
                </article>
              );
            }}
          </For>
        </div>
      </Show>
    </section>
  );
}
