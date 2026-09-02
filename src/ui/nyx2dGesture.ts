import type { OperatorRuntimeState } from './operatorRuntime';

export type Nyx2DEntryGesture =
  | 'none'
  | 'attention-settle'
  | 'focus-settle'
  | 'alert-brace'
  | 'success-ack';

export interface Nyx2DEntryGestureSpec {
  name: Nyx2DEntryGesture;
  durationMs: number;
}

const NONE: Nyx2DEntryGestureSpec = { name: 'none', durationMs: 0 };

const GESTURES: Partial<Record<OperatorRuntimeState, Nyx2DEntryGestureSpec>> = {
  observing: { name: 'attention-settle', durationMs: 900 },
  processing: { name: 'focus-settle', durationMs: 1050 },
  warning: { name: 'alert-brace', durationMs: 820 },
  success: { name: 'success-ack', durationMs: 980 },
};

/**
 * State-entry gestures are part of the stable 2D runtime. They are intentionally
 * one-shot and whole-operator transforms so they cannot break the approved head /
 * neck partition. Explicit false-like values remain an emergency QA rollback.
 */
export function nyx2DGesturesEnabled(value?: string): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return true;
  return normalized !== '0' && normalized !== 'false' && normalized !== 'off' && normalized !== 'no';
}

export function nyx2DEntryGestureForState(state: OperatorRuntimeState): Nyx2DEntryGestureSpec {
  return GESTURES[state] ?? NONE;
}
