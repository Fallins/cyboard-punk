import type { OperatorRuntimeState } from './operatorRuntime';

export type Nyx2DLifecycleBand = 'live' | 'offline';

/**
 * State changes inside the live band must not restart the 2.5D animation clock.
 * Only a lifecycle boundary such as entering/leaving offline is allowed to wake
 * or stop the runtime through Solid reactivity.
 */
export function nyx2DStateLifecycleBand(state: OperatorRuntimeState): Nyx2DLifecycleBand {
  return state === 'offline' ? 'offline' : 'live';
}
