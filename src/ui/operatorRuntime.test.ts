import { describe, expect, it } from 'vitest';
import { resolveOperatorRuntimeState } from './operatorRuntime';

describe('operator runtime', () => {
  it('maps provider and agent health to stable runtime states', () => {
    expect(resolveOperatorRuntimeState({ readyProviders: 0, totalProviders: 3, activeAgents: 0 })).toBe('offline');
    expect(resolveOperatorRuntimeState({ readyProviders: 3, totalProviders: 3, activeAgents: 2 })).toBe('processing');
    expect(resolveOperatorRuntimeState({ readyProviders: 2, totalProviders: 3, activeAgents: 0 })).toBe('warning');
    expect(resolveOperatorRuntimeState({ readyProviders: 3, totalProviders: 3, activeAgents: 0 })).toBe('idle');
  });

  it('uses observing during scans and success only when health is otherwise ready', () => {
    expect(resolveOperatorRuntimeState({
      readyProviders: 0,
      totalProviders: 3,
      activeAgents: 0,
      transientState: 'observing',
    })).toBe('observing');

    expect(resolveOperatorRuntimeState({
      readyProviders: 3,
      totalProviders: 3,
      activeAgents: 0,
      transientState: 'success',
    })).toBe('success');

    expect(resolveOperatorRuntimeState({
      readyProviders: 2,
      totalProviders: 3,
      activeAgents: 0,
      transientState: 'success',
    })).toBe('warning');
  });

});
