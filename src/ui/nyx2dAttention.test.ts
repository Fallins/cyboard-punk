import { describe, expect, it } from 'vitest';
import type { OperatorProviderPanel } from './operatorRuntime';
import { nyx2DAttentionBias, resolveNyx2DAttentionTarget } from './nyx2dAttention';

function panel(
  provider: OperatorProviderPanel['provider'],
  state: OperatorProviderPanel['state'],
  remainingPercent?: number,
): OperatorProviderPanel {
  return { provider, label: provider, state, remainingPercent };
}

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

  it('maps dashboard positions to restrained pose bias', () => {
    expect(nyx2DAttentionBias('codex').x).toBeLessThan(0);
    expect(nyx2DAttentionBias('claude').x).toBeLessThan(0);
    expect(nyx2DAttentionBias('cursor').x).toBeGreaterThan(0);
    expect(nyx2DAttentionBias('center')).toEqual({ x: 0, y: 0, rotationDeg: 0 });
  });
});
