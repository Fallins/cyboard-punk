export type OperatorRuntimeState =
  | 'idle'
  | 'observing'
  | 'processing'
  | 'warning'
  | 'success'
  | 'offline';

export type OperatorMode = 'female' | 'male';

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
