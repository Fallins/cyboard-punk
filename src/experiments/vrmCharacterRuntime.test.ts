import { describe, expect, it } from 'vitest';
import { assessExperimentalVrmCapability } from './vrmCharacterRuntime';

describe('experimental VRM capability gate', () => {
  it('accepts a complete humanoid and reports only source-supported standard expressions', () => {
    const capability = assessExperimentalVrmCapability({
      hasRawBone: () => true,
      hasExpression: (name) => name === 'happy' || name === 'relaxed',
    });

    expect(capability.animationReady).toBe(true);
    expect(capability.missingHumanoidBones).toEqual([]);
    expect(capability.availableExpressions).toEqual(['happy', 'relaxed']);
  });

  it('blocks motion playback when a VRM is missing a required humanoid bone', () => {
    const capability = assessExperimentalVrmCapability({
      hasRawBone: (name) => name !== 'leftFoot',
      hasExpression: () => false,
    });

    expect(capability.animationReady).toBe(false);
    expect(capability.missingHumanoidBones).toEqual(['leftFoot']);
    expect(capability.availableExpressions).toEqual([]);
  });
});
