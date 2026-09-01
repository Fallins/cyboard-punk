import { For, Show } from 'solid-js';
import type { ProviderSnapshot, QuotaSample } from '../domain/types';

function points(samples: QuotaSample[], width = 240, height = 46) {
  const relevant = samples.slice(-24);
  if (relevant.length < 2) return '';
  const firstTime = new Date(relevant[0]!.at).getTime();
  const lastTime = new Date(relevant.at(-1)!.at).getTime();
  const span = Math.max(1, lastTime - firstTime);
  return relevant
    .map((sample) => {
      const time = new Date(sample.at).getTime();
      const x = ((time - firstTime) / span) * width;
      const y = height - (Math.max(0, Math.min(100, sample.usedPercent)) / 100) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function QuotaTrend(props: { snapshots: ProviderSnapshot[] }) {
  const series = () =>
    props.snapshots
      .map((snapshot) => {
        const primary = snapshot.quota[0];
        return {
          provider: snapshot.provider,
          displayName: snapshot.displayName,
          samples: primary ? snapshot.quotaHistory.filter((sample) => sample.windowId === primary.id) : [],
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
        <span class="muted">last 24 samples</span>
      </div>
      <Show when={series().length > 0} fallback={<p class="muted trend-empty">Trend data builds while CYBOARD is running.</p>}>
        <div class="trend-grid">
          <For each={series()}>
            {(item) => (
              <article class="trend-series">
                <div><strong>{item.displayName}</strong><span>{item.samples.at(-1)?.usedPercent.toFixed(0)}% used</span></div>
                <svg viewBox="0 0 240 46" role="img" aria-label={`${item.displayName} quota usage trend`}>
                  <polyline points={points(item.samples)} vector-effect="non-scaling-stroke" />
                </svg>
              </article>
            )}
          </For>
        </div>
      </Show>
    </section>
  );
}
