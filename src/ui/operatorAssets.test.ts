import { describe, expect, it } from 'vitest';
import {
  OPERATOR_ASSETS,
  operatorAnimationCandidates,
  operatorAsset,
  operatorAssetPath,
  operatorPosterPath,
} from './operatorAssets';

const canonicalClips = ['idle', 'observing', 'processing', 'warning', 'success', 'offline'];

describe('legacy operator asset registry', () => {
  it('contains AXON only', () => {
    expect(OPERATOR_ASSETS.female).toBeUndefined();
    expect(operatorAsset('male')).toMatchObject({
      id: 'axon',
      displayName: 'AXON',
      role: 'Systems Operations Operator',
      glbPath: '/operator/axon/axon.glb',
      posterPath: '/operator/axon/poster.webp',
    });
  });

  it('rejects any attempt to resolve a NYX GLB asset', () => {
    expect(() => operatorAsset('female')).toThrow(/NYX has no GLB\/3D asset/);
    expect(() => operatorAssetPath('female')).toThrow(/NYX has no GLB\/3D asset/);
    expect(() => operatorPosterPath('female')).toThrow(/NYX has no GLB\/3D asset/);
  });

  it('keeps canonical production clip names on AXON', () => {
    expect(OPERATOR_ASSETS.male?.animationClips).toEqual(canonicalClips);
  });

  it('preserves runtime compatibility fallbacks for the legacy AXON renderer', () => {
    expect(operatorAnimationCandidates('processing')).toEqual(['processing', 'working', 'observing', 'idle']);
    expect(operatorAnimationCandidates('warning')).toEqual(['warning', 'observing', 'idle']);
  });

  it('keeps AXON public asset paths stable', () => {
    expect(operatorAssetPath('male')).toBe('/operator/axon/axon.glb');
    expect(operatorPosterPath('male')).toBe('/operator/axon/poster.webp');
  });
});
