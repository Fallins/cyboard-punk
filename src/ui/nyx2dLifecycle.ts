import type { OperatorRuntimeState } from './operatorRuntime';

export type Nyx2DRuntimeMode = 'loading' | 'suspended' | 'static' | 'animated';
export type Nyx2DRuntimeReason =
  | 'loading'
  | 'inactive'
  | 'offscreen'
  | 'document-hidden'
  | 'reduced-motion'
  | 'offline'
  | 'no-animated-channels'
  | 'active';

export interface Nyx2DLifecycleInput {
  ready: boolean;
  active: boolean;
  intersecting: boolean;
  documentVisible: boolean;
  reducedMotion: boolean;
  state: OperatorRuntimeState;
  hasAnimatedChannels: boolean;
}

export interface Nyx2DLifecycleDecision {
  mode: Nyx2DRuntimeMode;
  reason: Nyx2DRuntimeReason;
  shouldRender: boolean;
  shouldRunRaf: boolean;
}

/**
 * Final NYX 2D lifecycle policy.
 *
 * Hidden/inactive/offscreen states suspend rendering entirely. Reduced motion,
 * offline, or a renderer with no animated channels renders one neutral/static
 * frame but never keeps a RAF alive. Only a visible live renderer with at least
 * one animated channel may run continuously.
 */
export function resolveNyx2DLifecycle(input: Nyx2DLifecycleInput): Nyx2DLifecycleDecision {
  if (!input.ready) {
    return { mode: 'loading', reason: 'loading', shouldRender: false, shouldRunRaf: false };
  }
  if (!input.active) {
    return { mode: 'suspended', reason: 'inactive', shouldRender: false, shouldRunRaf: false };
  }
  if (!input.intersecting) {
    return { mode: 'suspended', reason: 'offscreen', shouldRender: false, shouldRunRaf: false };
  }
  if (!input.documentVisible) {
    return { mode: 'suspended', reason: 'document-hidden', shouldRender: false, shouldRunRaf: false };
  }
  if (input.reducedMotion) {
    return { mode: 'static', reason: 'reduced-motion', shouldRender: true, shouldRunRaf: false };
  }
  if (input.state === 'offline') {
    return { mode: 'static', reason: 'offline', shouldRender: true, shouldRunRaf: false };
  }
  if (!input.hasAnimatedChannels) {
    return { mode: 'static', reason: 'no-animated-channels', shouldRender: true, shouldRunRaf: false };
  }
  return { mode: 'animated', reason: 'active', shouldRender: true, shouldRunRaf: true };
}

/**
 * Resume deliberately restarts the local motion clock. We do not accumulate time
 * while suspended because doing so would feed a large delta into gaze/hair spring
 * integration and could create a visible jump when the app becomes visible again.
 */
export function nyx2DResumeRestartsMotionClock(
  previous: Nyx2DRuntimeMode,
  next: Nyx2DRuntimeMode,
): boolean {
  return previous !== 'animated' && next === 'animated';
}
