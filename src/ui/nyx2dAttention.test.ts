import { afterEach, describe, expect, it } from 'vitest';
import type { OperatorProviderPanel } from './operatorRuntime';
import {
  NYX_2D_BODY_ATTENTION_RESPONSE_MS,
  NYX_2D_HEAD_ATTENTION_RESPONSE_MS,
  nyx2DAttentionBias,
  nyx2DAttentionSide,
  nyx2DRuntimeAttentionRevision,
  nyx2DRuntimeAttentionSideMix,
  nyx2DRuntimeAttentionTarget,
  nyx2DRuntimeHeadAttentionBias,
  resetNyx2DRuntimeAttentionTarget,
  resolveNyx2DAttentionTarget,
  setNyx2DRuntimeAttentionTarget,
} from './nyx2dAttention';

function panel(
  provider: OperatorProviderPanel['provider'],
  state: OperatorProviderPanel['state'],
  remainingPercent?: number,
): OperatorProviderPanel {
  return { provider, label: provider, state, remainingPercent };
}

afterEach(() => resetNyx2DRuntimeAttentionTarget());

describe('NYX 2D attention targeting', () => {
  it('prefers the most constrained warning provider', () => {
    expect(
      resolveNyx2DAttentionTarget([
        panel('codex', 'warning', 18),
        panel('claude', 'warning', 7),
        panel('cursor', 'active', 40),
      ]),
    ).toBe('claude');
  });

  it('uses an active provider when there is no warning', () => {
    expect(
      resolveNyx2DAttentionTarget([
        panel('codex', 'ready', 80),
        panel('claude', 'ready', 70),
        panel('cursor', 'active', 50),
      ]),
    ).toBe('cursor');
  });

  it('returns center when no provider demands attention', () => {
    expect(
      resolveNyx2DAttentionTarget([
        panel('codex', 'ready', 80),
        panel('claude', 'ready', 70),
        panel('cursor', 'ready', 50),
      ]),
    ).toBe('center');
  });

  it('maps dashboard positions to matching left and right coordination sides', () => {
    expect(nyx2DAttentionSide('codex')).toBe(-1);
    expect(nyx2DAttentionSide('claude')).toBe(-1);
    expect(nyx2DAttentionSide('cursor')).toBe(1);
    expect(nyx2DAttentionSide('center')).toBe(0);
    expect(nyx2DAttentionBias('codex').x).toBeLessThan(0);
    expect(nyx2DAttentionBias('claude').x).toBeLessThan(0);
    expect(nyx2DAttentionBias('cursor').x).toBeGreaterThan(0);
    expect(nyx2DAttentionBias('center')).toEqual({ x: 0, y: 0, rotationDeg: 0 });
  });

  it('increments a target revision only when the provider target actually changes', () => {
    expect(nyx2DRuntimeAttentionRevision()).toBe(0);
    setNyx2DRuntimeAttentionTarget('cursor');
    expect(nyx2DRuntimeAttentionTarget()).toBe('cursor');
    expect(nyx2DRuntimeAttentionRevision()).toBe(1);
    setNyx2DRuntimeAttentionTarget('cursor');
    expect(nyx2DRuntimeAttentionRevision()).toBe(1);
    setNyx2DRuntimeAttentionTarget('codex');
    expect(nyx2DRuntimeAttentionRevision()).toBe(2);
  });

  it('keeps head position continuous when retargeted mid-motion', () => {
    expect(NYX_2D_HEAD_ATTENTION_RESPONSE_MS).toBeLessThan(NYX_2D_BODY_ATTENTION_RESPONSE_MS);
    setNyx2DRuntimeAttentionTarget('cursor');
    const start = nyx2DRuntimeHeadAttentionBias('processing', 1000);
    const movingRight = nyx2DRuntimeHeadAttentionBias('processing', 1140);
    expect(start.x).toBeCloseTo(0, 8);
    expect(movingRight.x).toBeGreaterThan(0);

    setNyx2DRuntimeAttentionTarget('codex');
    const retargetFrame = nyx2DRuntimeHeadAttentionBias('processing', 1140);
    expect(retargetFrame.x).toBeCloseTo(movingRight.x, 10);
    expect(retargetFrame.rotationDeg).toBeCloseTo(movingRight.rotationDeg, 10);

    const movingLeft = nyx2DRuntimeHeadAttentionBias('processing', 1280);
    expect(movingLeft.x).toBeLessThan(retargetFrame.x);
  });

  it('keeps upper-body provider-side mix continuous through a left-right retarget', () => {
    setNyx2DRuntimeAttentionTarget('cursor');
    expect(nyx2DRuntimeAttentionSideMix(2000)).toBeCloseTo(0, 8);
    const movingRight = nyx2DRuntimeAttentionSideMix(2240);
    expect(movingRight).toBeGreaterThan(0);
    expect(movingRight).toBeLessThan(1);

    setNyx2DRuntimeAttentionTarget('codex');
    const retargetFrame = nyx2DRuntimeAttentionSideMix(2240);
    expect(retargetFrame).toBeCloseTo(movingRight, 10);

    const movingLeft = nyx2DRuntimeAttentionSideMix(2480);
    expect(movingLeft).toBeLessThan(retargetFrame);
  });
});
