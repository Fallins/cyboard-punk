export type ProviderId = 'codex' | 'claude' | 'cursor';

export type ProviderCapability = 'quota' | 'usage' | 'sessions' | 'projectUsage' | 'credits';

export type Freshness = 'fresh' | 'stale' | 'unavailable';

export type ProviderSourceKind =
  | 'remote-api'
  | 'local-rpc'
  | 'local-cli'
  | 'local-file'
  | 'local-cache'
  | 'unavailable'
  | 'adapter';

export interface ProviderSource {
  kind: ProviderSourceKind;
  detail: string;
  isFallback: boolean;
}

export interface QuotaWindow {
  id: string;
  label: string;
  usedPercent: number;
  resetAt?: string;
}

export interface QuotaSample {
  at: string;
  windowId: string;
  usedPercent: number;
}

export type UsageSampleScope = 'thread-total' | 'request' | 'session-total';

export interface UsageSample {
  at: string;
  tokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  cacheCreationInputTokens?: number;
  costUsd?: number;
  project?: string;
  model?: string;
  scope?: UsageSampleScope;
}

export interface AgentSession {
  id: string;
  provider: ProviderId;
  project?: string;
  status: 'active' | 'idle';
  startedAt?: string;
  lastActivityAt?: string;
}

export type ProviderIssueCode =
  | 'not-installed'
  | 'login-required'
  | 'rate-limited'
  | 'network'
  | 'schema-changed'
  | 'stale-cache'
  | 'unknown';

export interface ProviderIssue {
  code: ProviderIssueCode;
  message: string;
  retryAt?: string;
}

export interface ProviderSnapshot {
  provider: ProviderId;
  displayName: string;
  capabilities: ProviderCapability[];
  quota: QuotaWindow[];
  quotaHistory: QuotaSample[];
  usage: UsageSample[];
  sessions: AgentSession[];
  freshness: Freshness;
  updatedAt: string;
  /**
   * Native adapters always emit source metadata. Optionality keeps older test
   * fixtures and persisted/mock snapshots forwards-compatible while they migrate.
   */
  source?: ProviderSource;
  issue?: ProviderIssue;
}

export interface CapacityForecast {
  remainingPercent: number;
  usedPercent: number;
  burnPercentPerHour?: number;
  projectedDepletionAt?: string;
  resetAt?: string;
  willDepleteBeforeReset: boolean;
}
