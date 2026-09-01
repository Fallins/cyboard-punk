export type ProviderId = 'codex' | 'claude' | 'cursor';

export type ProviderCapability = 'quota' | 'usage' | 'sessions' | 'projectUsage' | 'credits';

export type Freshness = 'fresh' | 'stale' | 'unavailable';

export interface QuotaWindow {
  id: string;
  label: string;
  usedPercent: number;
  resetAt?: string;
}

export interface UsageSample {
  at: string;
  tokens?: number;
  requests?: number;
  costUsd?: number;
}

export interface AgentSession {
  id: string;
  provider: ProviderId;
  project?: string;
  status: 'active' | 'idle';
  startedAt?: string;
  lastActivityAt?: string;
}

export interface ProviderIssue {
  code: 'not-installed' | 'login-required' | 'rate-limited' | 'network' | 'schema-changed' | 'unknown';
  message: string;
  retryAt?: string;
}

export interface ProviderSnapshot {
  provider: ProviderId;
  displayName: string;
  capabilities: ProviderCapability[];
  quota: QuotaWindow[];
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
