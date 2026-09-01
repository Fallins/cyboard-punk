import { describe, expect, it } from 'vitest';
import {
  OPERATOR_ASSETS,
  operatorAnimationCandidates,
  operatorAsset,
  operatorAssetPath,
  operatorPosterPath,
} from './operatorAssets';

const canonicalClips = ['idle', 'observing', 'processing', 'warning', 'success', 'offline'];

describe('operator asset registry', () => {
  it('resolves NYX from the canonical manifest', () => {
    expect(operatorAsset('female')).toMatchObject({
      id: 'nyx',
      displayName: 'NYX',
      role: 'Signal Intelligence Operator',
      glbPath: '/operator/nyx/nyx.glb',
      posterPath: '/operator/nyx/poster.webp',
    });
  });

  it('resolves AXON from the canonical manifest', () => {
    expect(operatorAsset('male')).toMatchObject({
      id: 'axon',
      displayName: 'AXON',
      role: 'Systems Operations Operator',
      glbPath: '/operator/axon/axon.glb',
      posterPath: '/operator/axon/poster.webp',
    });
  });

  it('keeps canonical production clip names on both operators', () => {
    expect(OPERATOR_ASSETS.female.animationClips).toEqual(canonicalClips);
    expect(OPERATOR_ASSETS.male.animationClips).toEqual(canonicalClips);
  });

  it('preserves runtime compatibility fallbacks without changing production names', () => {
    expect(operatorAnimationCandidates('processing')).toEqual(['processing', 'working', 'observing', 'idle']);
    expect(operatorAnimationCandidates('warning')).toEqual(['warning', 'observing', 'idle']);
  });

  it('keeps public asset paths stable', () => {
    expect(operatorAssetPath('female')).toBe('/operator/nyx/nyx.glb');
    expect(operatorPosterPath('female')).toBe('/operator/nyx/poster.webp');
    expect(operatorAssetPath('male')).toBe('/operator/axon/axon.glb');
    expect(operatorPosterPath('male')).toBe('/operator/axon/poster.webp');
  });
});
