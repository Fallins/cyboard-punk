import type { ProviderId, ProviderSnapshot } from '../domain/types';

export type OperatorRuntimeState =
  | 'idle'
  | 'observing'
  | 'processing'
  | 'warning'
  | 'success'
  | 'offline';

export type OperatorMode = 'female' | 'male';
export type OperatorProviderState = 'ready' | 'warning' | 'offline' | 'active';

export interface OperatorProviderPanel {
  provider: ProviderId;
  label: string;
  state: OperatorProviderState;
  remainingPercent?: number;
}

export function resolveOperatorRuntimeState(input: {
  readyProviders: number;
  totalProviders: number;
  activeAgents: number;
}): OperatorRuntimeState {
  const total = Math.max(0, input.totalProviders);
  const ready = Math.max(0, input.readyProviders);
  const active = Math.max(0, input.activeAgents);

  if (total > 0 && ready === 0) return 'offline';
  if (active > 0) return 'processing';
  if (ready < total) return 'warning';
  return 'idle';
}

export function buildOperatorProviderPanels(snapshots: ProviderSnapshot[]): OperatorProviderPanel[] {
  return snapshots.map((snapshot) => {
    const active = snapshot.sessions.some((session) => session.status === 'active');
    const constrained = snapshot.quota.reduce<(typeof snapshot.quota)[number] | undefined>(
      (current, candidate) =>
        current === undefined || candidate.usedPercent > current.usedPercent ? candidate : current,
      undefined,
    );
    const remainingPercent = constrained
      ? Math.max(0, Math.min(100, 100 - constrained.usedPercent))
      : undefined;

    let state: OperatorProviderState;
    if (active) {
      state = 'active';
    } else if (snapshot.freshness === 'unavailable' || snapshot.quota.length === 0) {
      state = 'offline';
    } else if (snapshot.freshness === 'stale' || (remainingPercent !== undefined && remainingPercent <= 20)) {
      state = 'warning';
    } else {
      state = 'ready';
    }

    return {
      provider: snapshot.provider,
      label: snapshot.displayName,
      state,
      remainingPercent,
    };
  });
}

export function operatorAssetPath(mode: OperatorMode): string {
  return mode === 'female' ? '/operator/nyx/nyx.glb' : '/operator/axon/axon.glb';
}

export function operatorAnimationCandidates(state: OperatorRuntimeState): string[] {
  switch (state) {
    case 'processing':
      return ['processing', 'working', 'observing', 'idle'];
    case 'warning':
      return ['warning', 'observing', 'idle'];
    case 'success':
      return ['success', 'idle'];
    case 'observing':
      return ['observing', 'idle'];
    case 'offline':
      return ['offline', 'idle'];
    case 'idle':
    default:
      return ['idle'];
  }
}
