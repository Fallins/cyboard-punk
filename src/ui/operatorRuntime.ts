import { mostConstrainedRemaining } from '../domain/quota';
import type { ProviderId, ProviderSnapshot } from '../domain/types';
export {
  operatorAnimationCandidates,
  operatorAsset,
  operatorAssetPath,
  operatorPosterPath,
} from './operatorAssets';

export type OperatorRuntimeState =
  | 'idle'
  | 'observing'
  | 'processing'
  | 'warning'
  | 'success'
  | 'offline';

export type OperatorMode = 'female' | 'male';
export type OperatorProviderState = 'ready' | 'warning' | 'offline' | 'active';
export type OperatorTransientState = 'observing' | 'success' | null;

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
  transientState?: OperatorTransientState;
}): OperatorRuntimeState {
  const total = Math.max(0, input.totalProviders);
  const ready = Math.max(0, input.readyProviders);
  const active = Math.max(0, input.activeAgents);

  if (input.transientState === 'observing') return 'observing';
  if (total > 0 && ready === 0) return 'offline';
  if (active > 0) return 'processing';
  if (ready < total) return 'warning';
  if (input.transientState === 'success') return 'success';
  return 'idle';
}

export function buildOperatorProviderPanels(snapshots: ProviderSnapshot[]): OperatorProviderPanel[] {
  return snapshots.map((snapshot) => {
    const active = snapshot.sessions.some((session) => session.status === 'active');
    const remainingPercent = mostConstrainedRemaining(snapshot);

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
