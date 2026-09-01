import { describe, expect, it } from 'vitest';
import {
  operatorAnimationCandidates,
  operatorAssetPath,
  resolveOperatorRuntimeState,
} from './operatorRuntime';

describe('operator runtime', () => {
  it('maps provider and agent health to stable runtime states', () => {
    expect(resolveOperatorRuntimeState({ readyProviders: 0, totalProviders: 4, activeAgents: 0 })).toBe('offline');
    expect(resolveOperatorRuntimeState({ readyProviders: 4, totalProviders: 4, activeAgents: 2 })).toBe('processing');
    expect(resolveOperatorRuntimeState({ readyProviders: 3, totalProviders: 4, activeAgents: 0 })).toBe('warning');
    expect(resolveOperatorRuntimeState({ readyProviders: 4, totalProviders: 4, activeAgents: 0 })).toBe('idle');
  });

  it('keeps production asset paths stable for NYX and AXON', () => {
    expect(operatorAssetPath('female')).toBe('/operator/nyx/nyx.glb');
    expect(operatorAssetPath('male')).toBe('/operator/axon/axon.glb');
  });

  it('falls back through compatible animation names', () => {
    expect(operatorAnimationCandidates('processing')).toEqual(['processing', 'working', 'observing', 'idle']);
    expect(operatorAnimationCandidates('warning')).toEqual(['warning', 'observing', 'idle']);
    expect(operatorAnimationCandidates('offline')).toEqual(['offline', 'idle']);
  });
});
