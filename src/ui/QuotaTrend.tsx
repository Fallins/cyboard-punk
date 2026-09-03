import { For, Show } from 'solid-js';
import type { ProviderSnapshot, QuotaSample, QuotaWindow } from '../domain/types';
import { formatQuotaWindowLabel, type AppLanguage } from '../i18n/core';
import { useI18n } from '../i18n/context';

const TREND_SAMPLE_LIMIT = 24;
const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 54;
const MIN_VISIBLE_RANGE = 4;
const FLAT_EPSILON = 0.05;

interface PreparedSample {
  sample: QuotaSample;
  time: number;
}

export interface TrendGeometry {
  points: string;
  areaPoints: string;
  deltaUsed: number;
  flat: boolean;
  minUsed: number;
  maxUsed: number;
  yMin: number;
  yMax: number;
  lastPoint?: { x: number; y: number };
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function prepareSamples(samples: QuotaSample[]): PreparedSample[] {
  return samples
    .map((sample) => ({ sample, time: new Date(sample.at).getTime() }))
    .filter((item) => Number.isFinite(item.time) && Number.isFinite(item.sample.usedPercent))
    .sort((a, b) => a.time - b.time)
    .slice(-TREND_SAMPLE_LIMIT);
}

function adaptiveDomain(values: number[]): [number, number] {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawRange = rawMax - rawMin;
  const padding = Math.max(1.5, rawRange * 0.35);
  let min = clampPercent(rawMin - padding);
  let max = clampPercent(rawMax + padding);

  if (max - min < MIN_VISIBLE_RANGE) {
    const center = (rawMin + rawMax) / 2;
    min = Math.max(0, center - MIN_VISIBLE_RANGE / 2);
    max = Math.min(100, center + MIN_VISIBLE_RANGE / 2);
    if (max - min < MIN_VISIBLE_RANGE) {
      if (min === 0) max = Math.min(100, MIN_VISIBLE_RANGE);
      if (max === 100) min = Math.max(0, 100 - MIN_VISIBLE_RANGE);
    }
  }

  return [min, max];
}

export function trendGeometry(samples: QuotaSample[], width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT): TrendGeometry {
  const relevant = prepareSamples(samples);
  if (relevant.length < 2) {
    return {
      points: '',
      areaPoints: '',
      deltaUsed: 0,
      flat: true,
      minUsed: 0,
      maxUsed: 0,
      yMin: 0,
      yMax: 100,
    };
  }

  const firstTime = relevant[0]!.time;
  const lastTime = relevant.at(-1)!.time;
  const span = Math.max(1, lastTime - firstTime);
  const values = relevant.map(({ sample }) => clampPercent(sample.usedPercent));
  const minUsed = Math.min(...values);
  const maxUsed = Math.max(...values);
  const [yMin, yMax] = adaptiveDomain(values);
  const ySpan = Math.max(Number.EPSILON, yMax - yMin);

  const coordinates = relevant.map(({ sample, time }) => {
    const x = Math.max(0, Math.min(width, ((time - firstTime) / span) * width));
    const used = clampPercent(sample.usedPercent);
    const y = Math.max(0, Math.min(height, height - ((used - yMin) / ySpan) * height));
    return { x, y };
  });
  const points = coordinates.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const deltaUsed = values.at(-1)! - values[0]!;

  return {
    points,
    areaPoints: `0,${height} ${points} ${width},${height}`,
    deltaUsed,
    flat: maxUsed - minUsed < FLAT_EPSILON,
    minUsed,
    maxUsed,
    yMin,
    yMax,
    lastPoint: coordinates.at(-1),
  };
}

export function trendPoints(samples: QuotaSample[], width = 240, height = 46) {
  return trendGeometry(samples, width, height).points;
}

function mostConstrainedQuota(quota: QuotaWindow[]) {
  return quota.reduce<QuotaWindow | undefined>(
    (mostConstrained, window) =>
      !mostConstrained || window.usedPercent > mostConstrained.usedPercent ? window : mostConstrained,
    undefined,
  );
}

function trendStateLabel(geometry: TrendGeometry, active: boolean, language: AppLanguage) {
  if (language === 'zh-TW') {
    if (geometry.flat) return active ? '上游無變化' : '額度無變化';
    if (geometry.deltaUsed < -5) return '偵測到重置';
    const sign = geometry.deltaUsed > 0 ? '+' : '';
    return `${sign}${geometry.deltaUsed.toFixed(1)}% 已用`;
  }
  if (geometry.flat) return active ? 'UPSTREAM UNCHANGED' : 'NO QUOTA DELTA';
  if (geometry.deltaUsed < -5) return 'RESET DETECTED';
  const sign = geometry.deltaUsed > 0 ? '+' : '';
  return `${sign}${geometry.deltaUsed.toFixed(1)}% USED`;
}

export default function QuotaTrend(props: { snapshots: ProviderSnapshot[] }) {
  const { t, language } = useI18n();
  const series = () =>
    props.snapshots
      .map((snapshot) => {
        const tracked = mostConstrainedQuota(snapshot.quota);
        const samples = tracked ? snapshot.quotaHistory.filter((sample) => sample.windowId === tracked.id) : [];
        const geometry = trendGeometry(samples);
        return {
          provider: snapshot.provider,
          displayName: snapshot.displayName,
          windowLabel: tracked?.label,
          currentUsed: tracked?.usedPercent,
          samples,
          geometry,
          active: snapshot.sessions.some((session) => session.status === 'active'),
        };
      })
      .filter((item) => item.samples.length > 1);

  return (
    <section class="trend-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">{t('burnRate')}</p>
          <h2>{t('quotaTrend')}</h2>
        </div>
        <span class="section-counter">{t('lastSamples')}</span>
      </div>
      <Show when={series().length > 0} fallback={<p class="muted trend-empty">{t('trendBuilds')}</p>}>
        <div class="trend-grid">
          <For each={series()}>
            {(item) => {
              const latestUsed = () => clampPercent(item.currentUsed ?? item.samples.at(-1)?.usedPercent ?? 0);
              const gradientId = `trend-fill-${item.provider}`;
              const stateLabel = () => trendStateLabel(item.geometry, item.active, language());
              return (
                <article class={`trend-series trend-series--${item.provider}`} data-flat={item.geometry.flat}>
                  <div class="trend-series__heading">
                    <div>
                      <strong>{item.displayName}</strong>
                      <small>{item.windowLabel ? formatQuotaWindowLabel(item.windowLabel, language()) : 'quota'}</small>
                    </div>
                    <span>{(100 - latestUsed()).toFixed(0)}% {t('left')}</span>
                  </div>
                  <svg
                    viewBox={`0 0 ${DEFAULT_WIDTH} ${DEFAULT_HEIGHT}`}
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={language() === 'zh-TW' ? `${item.displayName} 額度趨勢` : `${item.displayName} quota usage trend`}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-opacity="0.34" />
                        <stop offset="100%" stop-opacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="13.5" x2="240" y2="13.5" />
                    <line x1="0" y1="27" x2="240" y2="27" />
                    <line x1="0" y1="40.5" x2="240" y2="40.5" />
                    <polygon class="trend-area" points={item.geometry.areaPoints} fill={`url(#${gradientId})`} />
                    <polyline class="trend-line" points={item.geometry.points} vector-effect="non-scaling-stroke" />
                    <Show when={item.geometry.lastPoint}>
                      {(point) => <circle class="trend-endpoint" cx={point().x} cy={point().y} r="2.3" />}
                    </Show>
                  </svg>
                  <div class="trend-series__footer">
                    <span class="trend-delta" data-flat={item.geometry.flat} data-active={item.active}>
                      {stateLabel()}
                    </span>
                    <small>{item.samples.slice(-TREND_SAMPLE_LIMIT).length} {language() === 'zh-TW' ? '筆' : 'SAMPLES'}</small>
                  </div>
                </article>
              );
            }}
          </For>
        </div>
      </Show>
    </section>
  );
}
