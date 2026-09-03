import { For, Show } from 'solid-js';
import type { ProviderId, ProviderSnapshot } from '../domain/types';

const TOP_PROJECT_LIMIT = 5;

export interface UsageProjectSummary {
  project: string;
  tokens: number;
}

export interface ProviderUsageSummary {
  provider: ProviderId;
  displayName: string;
  tokens: number;
  samples: number;
  latestAt?: string;
  projects: UsageProjectSummary[];
}

export function summarizeProviderUsage(snapshot: ProviderSnapshot): ProviderUsageSummary | null {
  if (!snapshot.capabilities.includes('usage')) return null;
  const usable = snapshot.usage.filter((sample) => Number.isFinite(sample.tokens) && (sample.tokens ?? 0) > 0);
  if (usable.length === 0) return null;

  const projectTokens = new Map<string, number>();
  let tokens = 0;
  let latestTime = Number.NEGATIVE_INFINITY;
  let latestAt: string | undefined;

  for (const sample of usable) {
    const sampleTokens = sample.tokens ?? 0;
    tokens += sampleTokens;
    if (sample.project) {
      projectTokens.set(sample.project, (projectTokens.get(sample.project) ?? 0) + sampleTokens);
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

  return {
    provider: snapshot.provider,
    displayName: snapshot.displayName,
    tokens,
    samples: usable.length,
    latestAt,
    projects,
  };
}

export function formatTokenCount(tokens: number) {
  if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(tokens >= 10_000_000_000 ? 0 : 1)}B`;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens >= 10_000_000 ? 0 : 1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(tokens >= 10_000 ? 0 : 1)}K`;
  return tokens.toFixed(0);
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
          <p class="eyebrow">THREAD LIFETIME</p>
          <h2>Local Token Totals</h2>
        </div>
        <span class="section-counter">{summaries().length > 0 ? `${summaries().length} SOURCES` : 'NO DATA'}</span>
      </div>
      <Show
        when={summaries().length > 0}
        fallback={<p class="muted usage-empty">Reliable local thread totals will appear here when a provider exposes them.</p>}>
        <div class="usage-grid">
          <For each={summaries()}>
            {(summary) => (
              <article class="usage-provider" data-provider={summary.provider}>
                <div class="usage-provider__heading">
                  <div>
                    <strong>{summary.displayName}</strong>
                    <small>{summary.samples} recent indexed threads</small>
                  </div>
                  <span>{formatTokenCount(summary.tokens)} tokens</span>
                </div>
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
                  {(latestAt) => <small class="usage-updated">Latest indexed activity {new Date(latestAt()).toLocaleString()}</small>}
                </Show>
              </article>
            )}
          </For>
        </div>
      </Show>
    </section>
  );
}
