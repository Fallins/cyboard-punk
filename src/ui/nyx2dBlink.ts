import type { OperatorRuntimeState } from './operatorRuntime';

const BLINK_INTERVALS_MS = [4200, 5100, 3700, 5800, 4600] as const;
const CLOSE_MS = 105;
const HOLD_MS = 55;
const OPEN_MS = 165;
const BLINK_MS = CLOSE_MS + HOLD_MS + OPEN_MS;
const DOUBLE_GAP_MS = 150;

/**
 * Synthetic blink is intentionally quarantined.
 *
 * The approved NYX master only contains open eyes. The first shader prototype
 * tried to reconstruct closed lids from nearby pixels and could briefly render
 * dark/black eye patches. Until a real closed-lid/eyelid source layer exists,
 * enabling the old VITE_NYX_2D_BLINK flag must remain a no-op.
 */
export function nyx2DBlinkEnabled(_value?: string): boolean {
  return false;
}

function smoothStep01(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function blinkEnvelope(localMs: number): number {
  if (localMs < 0 || localMs >= BLINK_MS) return 0;
  if (localMs < CLOSE_MS) return smoothStep01(localMs / CLOSE_MS);
  if (localMs < CLOSE_MS + HOLD_MS) return 1;
  return 1 - smoothStep01((localMs - CLOSE_MS - HOLD_MS) / OPEN_MS);
}

function stateCadenceScale(state: OperatorRuntimeState): number {
  switch (state) {
    case 'warning':
      return 1.18;
    case 'processing':
      return 1.08;
    case 'observing':
      return 0.94;
    case 'success':
      return 0.90;
    case 'idle':
      return 1;
    case 'offline':
    default:
      return 0;
  }
}

export function nyx2DShouldAnimateBlink(
  state: OperatorRuntimeState,
  active: boolean,
  reducedMotion: boolean,
  featureEnabled: boolean,
): boolean {
  return featureEnabled && active && !reducedMotion && state !== 'offline';
}

// Keep the timing contract isolated for a future real eyelid asset. Runtime does
// not call this while nyx2DBlinkEnabled() is quarantined.
export function nyx2DBlinkAmountAtTime(state: OperatorRuntimeState, elapsedMs: number): number {
  const cadenceScale = stateCadenceScale(state);
  if (cadenceScale <= 0) return 0;

  const elapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const scaledIntervals = BLINK_INTERVALS_MS.map((value) => value * cadenceScale);
  const total = scaledIntervals.reduce((sum, value) => sum + value, 0);
  let cursor = elapsed % total;

  for (let index = 0; index < scaledIntervals.length; index += 1) {
    const interval = scaledIntervals[index];
    if (cursor < interval) {
      const isDouble = index === 3;
      const sequenceMs = isDouble ? BLINK_MS * 2 + DOUBLE_GAP_MS : BLINK_MS;
      const firstStart = interval - sequenceMs;
      const primary = blinkEnvelope(cursor - firstStart);

      if (isDouble) {
        const secondStart = firstStart + BLINK_MS + DOUBLE_GAP_MS;
        const second = blinkEnvelope(cursor - secondStart);
        return Math.max(primary, second);
      }
      return primary;
    }
    cursor -= interval;
  }

  return 0;
}
