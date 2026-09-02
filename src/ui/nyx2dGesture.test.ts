import { describe, expect, it } from 'vitest';
import { nyx2DEntryGestureForState, nyx2DGesturesEnabled } from './nyx2dGesture';

describe('NYX 2D state entry gestures', () => {
  it('is enabled by stable default but remains explicitly disableable', () => {
    expect(nyx2DGesturesEnabled(undefined)).toBe(true);
    expect(nyx2DGesturesEnabled('')).toBe(true);
    expect(nyx2DGesturesEnabled('1')).toBe(true);
    expect(nyx2DGesturesEnabled('0')).toBe(false);
    expect(nyx2DGesturesEnabled('false')).toBe(false);
    expect(nyx2DGesturesEnabled('off')).toBe(false);
  });

  it('keeps idle and offline neutral', () => {
    expect(nyx2DEntryGestureForState('idle')).toEqual({ name: 'none', durationMs: 0 });
    expect(nyx2DEntryGestureForState('offline')).toEqual({ name: 'none', durationMs: 0 });
  });

  it('gives each live reaction state one short non-looping semantic gesture', () => {
    expect(nyx2DEntryGestureForState('observing').name).toBe('attention-settle');
    expect(nyx2DEntryGestureForState('processing').name).toBe('focus-settle');
    expect(nyx2DEntryGestureForState('warning').name).toBe('alert-brace');
    expect(nyx2DEntryGestureForState('success').name).toBe('success-ack');

    for (const state of ['observing', 'processing', 'warning', 'success'] as const) {
      const gesture = nyx2DEntryGestureForState(state);
      expect(gesture.durationMs).toBeGreaterThanOrEqual(700);
      expect(gesture.durationMs).toBeLessThanOrEqual(1200);
    }
  });
});
