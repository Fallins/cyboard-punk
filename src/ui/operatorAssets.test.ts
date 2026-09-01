import { describe, expect, it } from 'vitest';
import {
  OPERATOR_ASSETS,
  operatorAnimationCandidates,
  operatorAsset,
  operatorAssetPath,
  operatorPosterPath,
} from './operatorAssets';

describe('operator asset registry', () => {
  it('keeps NYX and AXON production paths stable', () => {
    expect(operatorAsset('female').displayName).toBe('NYX');
    expect(operatorAsset('male').displayName).toBe('AXON');
    expect(operatorAssetPath('female')).toBe('/operator/nyx/nyx.glb');
    expect(operatorAssetPath('male')).toBe('/operator/axon/axon.glb');
    expect(operatorPosterPath('female')).toBe('/operator/nyx/poster.webp');
    expect(operatorPosterPath('male')).toBe('/operator/axon/poster.webp');
  });

  it('defines every runtime animation state for both operators', () => {
    const states = ['idle', 'observing', 'processing', 'warning', 'success', 'offline'] as const;
    for (const asset of Object.values(OPERATOR_ASSETS)) {
      for (const state of states) {
        expect(asset.animationClips[state].length).toBeGreaterThan(0);
      }
    }
  });

  it('preserves compatibility fallbacks for processing clips', () => {
    expect(operatorAnimationCandidates('processing')).toEqual([
      'processing',
      'working',
      'observing',
      'idle',
    ]);
  });
});
