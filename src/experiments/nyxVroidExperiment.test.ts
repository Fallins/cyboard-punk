import { describe, expect, it } from 'vitest';
import {
  NYX_VROID_AMBIENT_DEFAULT,
  NYX_VROID_CHARACTER,
  NYX_VROID_EXPERIMENT,
  experimentalVrmAvailableOutfits,
  experimentalVrmCharacterFor,
  experimentalVrmOutfitFor,
  nyxLocalizedLabel,
  nyxProductionVrmMotionFor,
  nyxProductionVrmMotions,
  nyxVrmCharacterCatalogLabel,
  nyxVroidMotions,
  nyxVroidMotionFor,
  nyxVroidMorphTargetFor,
} from './nyxVroidExperiment';

describe('NYX VRoid character contract', () => {
  it('publishes Shion as the reviewed production character without exposing an arbitrary model path', () => {
    expect(NYX_VROID_EXPERIMENT.defaultCharacterId).toBe(NYX_VROID_CHARACTER.id);
    expect(NYX_VROID_EXPERIMENT.characters).toContain(NYX_VROID_CHARACTER);
    expect(NYX_VROID_EXPERIMENT.characters.every((character) => character.production === true)).toBe(true);
    expect(NYX_VROID_CHARACTER).toMatchObject({
      id: 'shion-vroid-2-14-v1',
      label: 'Shion',
      labelZhTW: '紫苑',
      sourceRevision: 'VRoid Studio 2.14',
      assetPath: '/experiments/nyx-vroid/shion.vrm',
      sourceSha256: '4bb88b2f246be13fb2ca904edb1d18c670bd5f1ebb8d5fc236699059b96d2b41',
      vrmVersion: '1.0',
      production: true,
    });
    expect(NYX_VROID_CHARACTER.assetPath).not.toContain('/operator/nyx/');
    expect(NYX_VROID_CHARACTER.production).toBe(true);
    expect(NYX_VROID_EXPERIMENT.production).toBe(true);
    expect(experimentalVrmCharacterFor(NYX_VROID_CHARACTER.id)).toBe(NYX_VROID_CHARACTER);
    expect(experimentalVrmCharacterFor('unknown-character')).toBe(NYX_VROID_CHARACTER);
  });

  it('exposes only source-proven expression controls', () => {
    expect(nyxVroidMorphTargetFor('neutral')).toBe('Fcl_ALL_Neutral');
    expect(nyxVroidMorphTargetFor('happy')).toBe('Fcl_ALL_Joy');
    expect(nyxVroidMorphTargetFor('relaxed')).toBe('Fcl_ALL_Fun');
    expect(nyxVroidMorphTargetFor('surprised')).toBe('Fcl_ALL_Surprised');
    expect(nyxVroidMorphTargetFor('blink')).toBe('Fcl_EYE_Close');
    expect(nyxVroidMorphTargetFor('aa')).toBe('Fcl_MTH_A');
    expect(nyxVroidMorphTargetFor('mouthLarge')).toBe('Fcl_MTH_Large');
  });

  it('starts Shion in a relaxed source-supported expression with ambient Sig Breath', () => {
    expect(NYX_VROID_AMBIENT_DEFAULT).toEqual({
      expression: 'relaxed',
      intensity: 0.7,
      sigBreathEnabled: true,
    });
  });

  it('keeps third-party motion licenses distinct and removes the rejected project-authored motion pack', () => {
    expect(NYX_VROID_CHARACTER.motionPacks).toHaveLength(2);
    expect(NYX_VROID_CHARACTER.motionPacks[0].attribution).toBe("Animation credits to pixiv Inc.'s VRoid Project");
    expect(NYX_VROID_CHARACTER.motionPacks[0].motions).toHaveLength(7);
    expect(NYX_VROID_CHARACTER.motionPacks[1].sourceArchiveSha256).toBe(
      '546032815ff89aeafad47d8331a01e9c28d8d2c319fabdcee26e3a67ac85b26f',
    );
    expect(NYX_VROID_CHARACTER.motionPacks[1].redistributionNote).toContain('No unmodified redistribution');
    expect(nyxVroidMotions()).toHaveLength(11);
    expect(nyxProductionVrmMotions()).toHaveLength(7);
    expect(nyxVroidMotionFor('greeting')).toMatchObject({
      id: 'greeting',
      face: { expression: 'happy', intensity: 0.7 },
      assetPath: '/experiments/nyx-vroid/vrma/VRMA_02.vrma',
    });
    expect(nyxVroidMotionFor('showFullBody').face).toEqual({ expression: 'relaxed', intensity: 0.65 });
    expect(nyxVroidMotionFor('squat').face).toEqual({ expression: 'relaxed', intensity: 0.55 });
    expect(nyxVroidMotionFor('allSmilesWorld')).toMatchObject({
      sourceName: 'みんなの笑顔で彩る世界.vrma',
      face: { expression: 'happy', intensity: 0.85 },
      assetPath: '/experiments/nyx-vroid/local-assets/wonderful/all-smiles-world.vrma',
    });
    expect(nyxVroidMotionFor('greeting').assetPath).not.toContain('/operator/nyx/');
  });

  it('binds every published VRoid Project action to the reviewed Shion humanoid catalog', () => {
    const published = nyxProductionVrmMotions();

    expect(new Set(published.map((motion) => motion.id)).size).toBe(7);
    expect(published.map((motion) => motion.id)).toEqual([
      'showFullBody',
      'greeting',
      'peaceSign',
      'shoot',
      'spin',
      'modelPose',
      'squat',
    ]);
    for (const motion of published) {
      expect(nyxProductionVrmMotionFor(motion.id)).toBe(motion);
      expect(motion.assetPath).toMatch(/^\/experiments\/nyx-vroid\/vrma\/VRMA_0[1-7]\.vrma$/);
    }
  });

  it('provides a Traditional Chinese label for every motion exposed by the catalog', () => {
    for (const motion of nyxVroidMotions()) {
      expect(nyxLocalizedLabel(motion, 'zh-TW')).not.toBe(motion.label);
      expect(nyxLocalizedLabel(motion, 'en')).toBe(motion.label);
    }
  });

  it('allows only the approved Shion character and baked tailored outfit variation in the runtime', () => {
    expect(NYX_VROID_EXPERIMENT.characters).toEqual([NYX_VROID_CHARACTER]);
    expect(experimentalVrmCharacterFor('fdl-vrm-1-0')).toBe(NYX_VROID_CHARACTER);
    expect(experimentalVrmAvailableOutfits(NYX_VROID_CHARACTER)).toEqual([
      expect.objectContaining({ id: 'tailored-jacket' }),
    ]);
    expect(experimentalVrmOutfitFor(NYX_VROID_CHARACTER, 'techwearCropRed')).toMatchObject({
      id: 'tailored-jacket',
    });
  });

  it('makes the reviewed source revision visible only in the character-addition selector', () => {
    expect(nyxVrmCharacterCatalogLabel(NYX_VROID_CHARACTER, 'zh-TW')).toBe('紫苑 · VRoid Studio 2.14');
    expect(nyxVrmCharacterCatalogLabel(NYX_VROID_CHARACTER, 'en')).toBe('Shion · VRoid Studio 2.14');
    expect(nyxLocalizedLabel(NYX_VROID_CHARACTER, 'zh-TW')).toBe('紫苑');
  });
});
