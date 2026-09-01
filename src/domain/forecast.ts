import type { CapacityForecast, QuotaSample, QuotaWindow } from './types';

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export function forecastQuota(
  window: QuotaWindow,
  history: QuotaSample[],
  now = new Date(),
): CapacityForecast {
  const usedPercent = clampPercent(window.usedPercent);
  const remainingPercent = 100 - usedPercent;
  const resetAt = window.resetAt;
  const samples = history.filter((sample) => sample.windowId === window.id);

  if (samples.length < 2 || usedPercent <= 0 || remainingPercent <= 0) {
    return {
      remainingPercent,
      usedPercent,
      resetAt,
      willDepleteBeforeReset: remainingPercent <= 0,
    };
  }

  const ordered = [...samples]
    .map((sample) => ({ ...sample, ts: new Date(sample.at).getTime() }))
    .filter((sample) => Number.isFinite(sample.ts))
    .sort((a, b) => a.ts - b.ts);
  const first = ordered[0];
  const last = ordered.at(-1);

  if (!first || !last || first.ts === last.ts) {
    return { remainingPercent, usedPercent, resetAt, willDepleteBeforeReset: false };
  }

  const elapsedHours = Math.max((last.ts - first.ts) / 3_600_000, 1 / 60);
  const burnPercentPerHour = Math.max(0, (last.usedPercent - first.usedPercent) / elapsedHours);

  if (burnPercentPerHour <= 0) {
    return { remainingPercent, usedPercent, burnPercentPerHour: 0, resetAt, willDepleteBeforeReset: false };
  }

  const depletionMs = now.getTime() + (remainingPercent / burnPercentPerHour) * 3_600_000;
  const projectedDepletionAt = new Date(depletionMs).toISOString();
  const resetMs = resetAt ? new Date(resetAt).getTime() : Number.NaN;

  return {
    remainingPercent,
    usedPercent,
    burnPercentPerHour,
    projectedDepletionAt,
    resetAt,
    willDepleteBeforeReset: Number.isFinite(resetMs) ? depletionMs < resetMs : false,
  };
}
