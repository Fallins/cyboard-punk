import type { AgentSession, ProviderId, ProviderSnapshot } from './types';

const REQUIRED_MISSING_OBSERVATIONS = 2;
const MAX_CLOSEOUTS = 12;

export interface TrackedSession {
  provider: ProviderId;
  displayName: string;
  session: AgentSession;
  firstSeenAt: string;
  lastSeenAt: string;
  misses: number;
}

export interface SessionCloseout {
  provider: ProviderId;
  displayName: string;
  sessionId: string;
  project?: string;
  startedAt?: string;
  lastSeenAt: string;
  detectedAt: string;
  observedActiveMinutes?: number;
}

export interface SessionCloseoutState {
  tracked: Record<string, TrackedSession>;
  closeouts: SessionCloseout[];
}

export function emptySessionCloseoutState(): SessionCloseoutState {
  return { tracked: {}, closeouts: [] };
}

function sessionKey(session: Pick<AgentSession, 'provider' | 'id'>): string {
  return `${session.provider}:${session.id}`;
}

function validTimestamp(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = new Date(raw).getTime();
  return Number.isFinite(value) ? value : undefined;
}

function observedDurationMinutes(tracked: TrackedSession): number | undefined {
  const lastSeen = validTimestamp(tracked.lastSeenAt);
  if (lastSeen === undefined) return undefined;
  const providerStartedAt = validTimestamp(tracked.session.startedAt);
  const firstSeen = validTimestamp(tracked.firstSeenAt);
  const startedAt = providerStartedAt !== undefined && providerStartedAt <= lastSeen ? providerStartedAt : firstSeen;
  if (startedAt === undefined || startedAt > lastSeen) return undefined;
  return Math.max(0, Math.floor((lastSeen - startedAt) / 60_000));
}

function toCloseout(tracked: TrackedSession, detectedAt: string): SessionCloseout {
  return {
    provider: tracked.provider,
    displayName: tracked.displayName,
    sessionId: tracked.session.id,
    project: tracked.session.project,
    startedAt: tracked.session.startedAt,
    lastSeenAt: tracked.session.lastActivityAt ?? tracked.lastSeenAt,
    detectedAt,
    observedActiveMinutes: observedDurationMinutes(tracked),
  };
}

export function observeSessionCloseouts(
  state: SessionCloseoutState,
  snapshots: ProviderSnapshot[],
  observedAt = new Date(),
): SessionCloseoutState {
  const observedAtIso = observedAt.toISOString();
  const tracked: Record<string, TrackedSession> = { ...state.tracked };
  const freshProviders = new Set(
    snapshots.filter((snapshot) => snapshot.freshness === 'fresh').map((snapshot) => snapshot.provider),
  );
  const activeKeys = new Set<string>();

  for (const snapshot of snapshots) {
    for (const session of snapshot.sessions) {
      if (session.status !== 'active') continue;
      const key = sessionKey(session);
      activeKeys.add(key);
      const existing = tracked[key];
      tracked[key] = {
        provider: session.provider,
        displayName: snapshot.displayName,
        session,
        firstSeenAt: existing?.firstSeenAt ?? observedAtIso,
        lastSeenAt: observedAtIso,
        misses: 0,
      };
    }
  }

  const newCloseouts: SessionCloseout[] = [];
  for (const [key, current] of Object.entries(tracked)) {
    if (activeKeys.has(key) || !freshProviders.has(current.provider)) continue;
    const misses = current.misses + 1;
    if (misses < REQUIRED_MISSING_OBSERVATIONS) {
      tracked[key] = { ...current, misses };
      continue;
    }
    newCloseouts.push(toCloseout(current, observedAtIso));
    delete tracked[key];
  }

  return {
    tracked,
    closeouts: [...newCloseouts.reverse(), ...state.closeouts].slice(0, MAX_CLOSEOUTS),
  };
}
