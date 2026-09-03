import { afterEach, describe, expect, it } from 'vitest';
import type { OperatorProviderPanel } from './operatorRuntime';
import {
  NYX_2D_ATTENTION_TRANSITION_MS,
  nyx2DAttentionBias,
  nyx2DAttentionSide,
  nyx2DRuntimeAttentionTransition,
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

  it('smooths a live provider target change without changing renderer lifecycle', () => {
    setNyx2DRuntimeAttentionTarget('cursor', 1000);
    expect(nyx2DRuntimeAttentionTransition(1000)).toEqual({
      from: 'center',
      target: 'cursor',
      progress: 0,
    });

    const halfway = nyx2DRuntimeAttentionTransition(1000 + NYX_2D_ATTENTION_TRANSITION_MS / 2);
    expect(halfway.progress).toBeCloseTo(0.5, 6);

    const settled = nyx2DRuntimeAttentionTransition(1000 + NYX_2D_ATTENTION_TRANSITION_MS);
    expect(settled.target).toBe('cursor');
    expect(settled.progress).toBe(1);
  });

  it('uses the same transition for head attention bias', () => {
    setNyx2DRuntimeAttentionTarget('codex', 2000);
    const start = nyx2DRuntimeHeadAttentionBias('processing', 2000);
    const end = nyx2DRuntimeHeadAttentionBias(
      'processing',
      2000 + NYX_2D_ATTENTION_TRANSITION_MS,
    );
    expect(start.x).toBeCloseTo(0, 8);
    expect(end.x).toBeLessThan(0);
    expect(end.rotationDeg).toBeGreaterThan(0);
  });
});
