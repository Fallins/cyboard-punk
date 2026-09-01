export type ProviderId = 'codex' | 'claude' | 'cursor' | 'antigravity';

export type ProviderCapability = 'quota' | 'usage' | 'sessions' | 'projectUsage' | 'credits';

export type Freshness = 'fresh' | 'stale' | 'unavailable';

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

export interface UsageSample {
  at: string;
  tokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  costUsd?: number;
  project?: string;
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
  | 'not-running'
  | 'local-service-unavailable'
  | 'login-required'
  | 'rate-limited'
  | 'network'
  | 'schema-changed'
  | 'stale-cache'
  | 'keychain'
  | 'cloud-not-permitted'
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
