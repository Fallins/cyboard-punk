export type OperatorRuntimeState =
  | 'idle'
  | 'observing'
  | 'processing'
  | 'warning'
  | 'success'
  | 'offline';

export type OperatorTransientState = 'observing' | 'success' | null;

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
