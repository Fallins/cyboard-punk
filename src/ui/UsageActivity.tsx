import { For, Show } from 'solid-js';
import type { ProviderId, ProviderSnapshot, UsageSampleScope } from '../domain/types';

const TOP_PROJECT_LIMIT = 5;
const TOP_MODEL_LIMIT = 3;

export interface UsageProjectSummary {
  project: string;
  tokens: number;
}

export interface UsageModelSummary {
  model: string;
  tokens: number;
}

export interface ProviderUsageSummary {
  provider: ProviderId;
  displayName: string;
  tokens: number;
  samples: number;
  scope?: UsageSampleScope;
  latestAt?: string;
  projects: UsageProjectSummary[];
  models: UsageModelSummary[];
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  cacheCreationInputTokens?: number;
  costUsd?: number;
}

export function summarizeProviderUsage(snapshot: ProviderSnapshot): ProviderUsageSummary | null {
  if (!snapshot.capabilities.includes('usage')) return null;
  const usable = snapshot.usage.filter((sample) => Number.isFinite(sample.tokens) && (sample.tokens ?? 0) > 0);
  if (usable.length === 0) return null;

  const projectTokens = new Map<string, number>();
  const modelTokens = new Map<string, number>();
  const scopes = new Set(usable.map((sample) => sample.scope).filter((scope): scope is UsageSampleScope => Boolean(scope)));
  let tokens = 0;
  let latestTime = Number.NEGATIVE_INFINITY;
  let latestAt: string | undefined;
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens = 0;
  let cacheCreationInputTokens = 0;
  let costUsd = 0;
  let hasBreakdown = false;
  let hasMeasuredCost = false;

  for (const sample of usable) {
    const sampleTokens = sample.tokens ?? 0;
    tokens += sampleTokens;
    if (sample.project) {
      projectTokens.set(sample.project, (projectTokens.get(sample.project) ?? 0) + sampleTokens);
    }
    if (sample.model) {
      modelTokens.set(sample.model, (modelTokens.get(sample.model) ?? 0) + sampleTokens);
    }
    for (const value of [sample.inputTokens, sample.outputTokens, sample.cachedInputTokens, sample.cacheCreationInputTokens]) {
      if (Number.isFinite(value)) hasBreakdown = true;
    }
    inputTokens += sample.inputTokens ?? 0;
    outputTokens += sample.outputTokens ?? 0;
    cachedInputTokens += sample.cachedInputTokens ?? 0;
    cacheCreationInputTokens += sample.cacheCreationInputTokens ?? 0;
    if (Number.isFinite(sample.costUsd) && (sample.costUsd ?? -1) >= 0) {
      hasMeasuredCost = true;
      costUsd += sample.costUsd ?? 0;
    }

    const time = new Date(sample.at).getTime();
    if (Number.isFinite(time) && time > latestTime) {
      latestTime = time;
      latestAt = sample.at;
    }
  }

  const projects = [...projectTokens.entries()]
    .map(([project, projectTokens]) => ({ project, tokens: projectTokens }))
    .sort((a, b) => b.tokens - a.tokens || a.project.localeCompare(b.project))
    .slice(0, TOP_PROJECT_LIMIT);
  const models = [...modelTokens.entries()]
    .map(([model, modelTokenCount]) => ({ model, tokens: modelTokenCount }))
    .sort((a, b) => b.tokens - a.tokens || a.model.localeCompare(b.model))
    .slice(0, TOP_MODEL_LIMIT);

  return {
    provider: snapshot.provider,
    displayName: snapshot.displayName,
    tokens,
    samples: usable.length,
    scope: scopes.size === 1 ? [...scopes][0] : undefined,
    latestAt,
    projects,
    models,
    inputTokens: hasBreakdown ? inputTokens : undefined,
    outputTokens: hasBreakdown ? outputTokens : undefined,
    cachedInputTokens: hasBreakdown ? cachedInputTokens : undefined,
    cacheCreationInputTokens: hasBreakdown ? cacheCreationInputTokens : undefined,
    costUsd: hasMeasuredCost ? costUsd : undefined,
  };
}

function countedLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function sampleDescription(summary: ProviderUsageSummary) {
  if (summary.scope === 'thread-total') return countedLabel(summary.samples, 'recent indexed thread');
  if (summary.scope === 'request') return countedLabel(summary.samples, 'recent request');
  if (summary.scope === 'session-total') return countedLabel(summary.samples, 'recent session');
  return countedLabel(summary.samples, 'usage record');
}

export function formatTokenCount(tokens: number) {
  if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(tokens >= 10_000_000_000 ? 0 : 1)}B`;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens >= 10_000_000 ? 0 : 1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(tokens >= 10_000 ? 0 : 1)}K`;
  return tokens.toFixed(0);
}

export function formatUsageCost(costUsd: number) {
  if (costUsd > 0 && costUsd < 0.01) return '<$0.01';
  return `$${costUsd.toFixed(2)}`;
}

export default function UsageActivity(props: { snapshots: ProviderSnapshot[] }) {
  const summaries = () =>
    props.snapshots
      .map(summarizeProviderUsage)
      .filter((summary): summary is ProviderUsageSummary => summary !== null);

  return (
    <section class="usage-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">TOKEN TELEMETRY</p>
          <h2>Token Activity</h2>
        </div>
        <span class="section-counter">{summaries().length > 0 ? `${summaries().length} SOURCES` : 'NO DATA'}</span>
      </div>
      <Show
        when={summaries().length > 0}
        fallback={<p class="muted usage-empty">Reliable token telemetry will appear here when a provider exposes it.</p>}>
        <div class="usage-grid">
          <For each={summaries()}>
            {(summary) => (
              <article class="usage-provider" data-provider={summary.provider}>
                <div class="usage-provider__heading">
                  <div>
                    <strong>{summary.displayName}</strong>
                    <small>{sampleDescription(summary)}</small>
                  </div>
                  <div class="usage-provider__totals">
                    <span>{formatTokenCount(summary.tokens)} tokens</span>
                    <Show when={summary.costUsd !== undefined}>
                      <small>{formatUsageCost(summary.costUsd ?? 0)} measured</small>
                    </Show>
                  </div>
                </div>
                <Show when={summary.inputTokens !== undefined}>
                  <div class="usage-breakdown" aria-label={`${summary.displayName} token breakdown`}>
                    <span>IN <strong>{formatTokenCount(summary.inputTokens ?? 0)}</strong></span>
                    <span>CACHE READ <strong>{formatTokenCount(summary.cachedInputTokens ?? 0)}</strong></span>
                    <span>CACHE WRITE <strong>{formatTokenCount(summary.cacheCreationInputTokens ?? 0)}</strong></span>
                    <span>OUT <strong>{formatTokenCount(summary.outputTokens ?? 0)}</strong></span>
                  </div>
                </Show>
                <Show when={summary.models.length > 0}>
                  <div class="usage-model-section">
                    <small>MODEL MIX</small>
                    <div class="usage-model-list">
                      <For each={summary.models}>
                        {(model) => (
                          <span title={model.model}>
                            <em>{model.model}</em>
                            <strong>{formatTokenCount(model.tokens)}</strong>
                          </span>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
                <Show
                  when={summary.projects.length > 0}
                  fallback={<p class="muted usage-project-empty">Project attribution unavailable for these samples.</p>}>
                  <div class="usage-project-list">
                    <For each={summary.projects}>
                      {(project) => (
                        <div class="usage-project-row">
                          <span title={project.project}>{project.project}</span>
                          <strong>{formatTokenCount(project.tokens)}</strong>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
                <Show when={summary.latestAt}>
                  {(latestAt) => <small class="usage-updated">Latest measured activity {new Date(latestAt()).toLocaleString()}</small>}
                </Show>
              </article>
            )}
          </For>
        </div>
      </Show>
    </section>
  );
}
