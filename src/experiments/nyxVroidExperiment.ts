import {
  type ExperimentalVrmCharacter,
  type ExperimentalVrmMotion,
  type ExperimentalVrmMotionPack,
  type ExperimentalVrmOutfit,
  type VrmPresetExpression,
} from './vrmCharacterRuntime';
import type { NyxVrmExpressionId } from './nyxVrmExpressions';
import type { AppLanguage } from '../i18n/core';

const MOTION_PACKS = [
  {
    id: 'vroid-project',
    label: 'VRoid Project free motions',
    labelZhTW: 'VRoid Project 免費動作',
    sourceArchiveSha256: '64d6e87d12ad0e43daaf4f261f74b05322329b9f18b9b7ab4da6f9611b995af8',
    attribution: "Animation credits to pixiv Inc.'s VRoid Project",
    availability: 'production',
    motions: [
      {
        id: 'showFullBody',
        label: 'Show full body',
        labelZhTW: '全身展示',
        assetPath: '/experiments/nyx-vroid/vrma/VRMA_01.vrma',
        face: { expression: 'relaxed', intensity: 0.65 },
      },
      {
        id: 'greeting',
        label: 'Greeting',
        labelZhTW: '打招呼',
        assetPath: '/experiments/nyx-vroid/vrma/VRMA_02.vrma',
        face: { expression: 'happy', intensity: 0.7 },
      },
      {
        id: 'peaceSign',
        label: 'Peace sign',
        labelZhTW: '比 YA',
        assetPath: '/experiments/nyx-vroid/vrma/VRMA_03.vrma',
        face: { expression: 'happy', intensity: 0.85 },
      },
      {
        id: 'shoot',
        label: 'Shoot',
        labelZhTW: '射擊姿勢',
        assetPath: '/experiments/nyx-vroid/vrma/VRMA_04.vrma',
        face: { expression: 'relaxed', intensity: 0.65 },
      },
      {
        id: 'spin',
        label: 'Spin',
        labelZhTW: '旋轉',
        assetPath: '/experiments/nyx-vroid/vrma/VRMA_05.vrma',
        face: { expression: 'relaxed', intensity: 0.55 },
      },
      {
        id: 'modelPose',
        label: 'Model pose',
        labelZhTW: '模特定格',
        assetPath: '/experiments/nyx-vroid/vrma/VRMA_06.vrma',
        face: { expression: 'relaxed', intensity: 0.55 },
      },
      {
        id: 'squat',
        label: 'Squat',
        labelZhTW: '下蹲',
        assetPath: '/experiments/nyx-vroid/vrma/VRMA_07.vrma',
        face: { expression: 'relaxed', intensity: 0.55 },
      },
    ],
  },
  {
    id: 'wonderful-vrma-set',
    label: 'Wonderful VRMA set',
    labelZhTW: 'Wonderful VRMA 動作包',
    sourceArchiveSha256: '546032815ff89aeafad47d8331a01e9c28d8d2c319fabdcee26e3a67ac85b26f',
    attribution: 'User-supplied Wonderful VRMA set; author not identified in the included readme.',
    availability: 'local-development',
    redistributionNote: 'No unmodified redistribution; no paid redistribution of modified files.',
    motions: [
      {
        id: 'allSmilesWorld',
        label: 'All smiles, coloring the world',
        labelZhTW: '大家的笑容點亮世界',
        sourceName: 'みんなの笑顔で彩る世界.vrma',
        assetPath: '/experiments/nyx-vroid/local-assets/wonderful/all-smiles-world.vrma',
        face: { expression: 'happy', intensity: 0.85 },
      },
      {
        id: 'wonderfulWorld',
        label: 'A wonderful world everyone loves',
        labelZhTW: '人人喜愛的美好世界',
        sourceName: 'みんな大好き素敵な世界.vrma',
        assetPath: '/experiments/nyx-vroid/local-assets/wonderful/wonderful-world.vrma',
        face: { expression: 'happy', intensity: 0.78 },
      },
      {
        id: 'sparklingWorld',
        label: 'A proud, cute, sparkling world',
        labelZhTW: '高貴可愛的閃耀世界',
        sourceName: '気高く可愛く煌めく世界.vrma',
        assetPath: '/experiments/nyx-vroid/local-assets/wonderful/sparkling-world.vrma',
        face: { expression: 'relaxed', intensity: 0.75 },
      },
      {
        id: 'connectedWorld',
        label: 'A world of ties, threads, and connections',
        labelZhTW: '編織連結的世界',
        sourceName: '結んで紡いで繋がる世界.vrma',
        assetPath: '/experiments/nyx-vroid/local-assets/wonderful/connected-world.vrma',
        face: { expression: 'happy', intensity: 0.68 },
      },
    ],
  },
] as const satisfies readonly ExperimentalVrmMotionPack[];

export const NYX_VROID_CHARACTER = {
  id: 'shion-vroid-2-14-v1',
  label: 'Shion',
  labelZhTW: '紫苑',
  sourceRevision: 'VRoid Studio 2.14',
  assetPath: '/experiments/nyx-vroid/shion.vrm',
  sourceSha256: '4bb88b2f246be13fb2ca904edb1d18c670bd5f1ebb8d5fc236699059b96d2b41',
  production: true,
  vrmVersion: '1.0',
  faceForward: '+Z',
  targetHeight: 2.75,
  defaultOutfitId: 'tailored-jacket',
  outfits: [
    {
      id: 'tailored-jacket',
      label: 'Tailored violet-black jacket',
      labelZhTW: '黑紫修身外套',
      availability: 'available',
    },
  ],
  motionPacks: MOTION_PACKS,
} as const satisfies ExperimentalVrmCharacter;

export const NYX_VROID_AMBIENT_DEFAULT = {
  expression: 'relaxed',
  intensity: 0.7,
  sigBreathEnabled: true,
} as const satisfies {
  readonly expression: VrmPresetExpression;
  readonly intensity: number;
  readonly sigBreathEnabled: boolean;
};

export const EXPERIMENTAL_VRM_CHARACTERS = [NYX_VROID_CHARACTER] as const;

export const NYX_VROID_EXPERIMENT = {
  defaultCharacterId: NYX_VROID_CHARACTER.id,
  production: true,
  hasEmbeddedAnimations: false,
  characters: EXPERIMENTAL_VRM_CHARACTERS,
  rendererNotes: [
    'The same approved VRM/VRMA catalog powers the production NYX runtime and local preview.',
    'Wonderful VRMAs remain local-development only and are never selected by production settings.',
  ],
} as const;

const MORPH_TARGETS = {
  neutral: 'Fcl_ALL_Neutral',
  happy: 'Fcl_ALL_Joy',
  angry: 'Fcl_ALL_Angry',
  sad: 'Fcl_ALL_Sorrow',
  relaxed: 'Fcl_ALL_Fun',
  surprised: 'Fcl_ALL_Surprised',
  blink: 'Fcl_EYE_Close',
  mouthLarge: 'Fcl_MTH_Large',
  aa: 'Fcl_MTH_A',
  ih: 'Fcl_MTH_I',
  ou: 'Fcl_MTH_U',
  ee: 'Fcl_MTH_E',
  oh: 'Fcl_MTH_O',
} as const;

export type NyxVroidExpression = keyof typeof MORPH_TARGETS;
export type NyxVroidMotion = (typeof MOTION_PACKS)[number]['motions'][number];
export type NyxVroidMotionId = NyxVroidMotion['id'];
export type NyxVroidMotionFace = NyxVrmExpressionId;

export const NYX_RUNTIME_EVENTS = ['idle', 'observing', 'processing', 'warning', 'success', 'offline'] as const;
export type NyxRuntimeEvent = (typeof NYX_RUNTIME_EVENTS)[number];

export const NYX_REST_MOTION_ID = 'rest' as const;
export type NyxRuntimeMotionId = typeof NYX_REST_MOTION_ID | NyxVroidMotionId;

export const NYX_RANDOM_ACTION_INTERVALS = [30, 60, 120, 300] as const;
export type NyxRandomActionInterval = (typeof NYX_RANDOM_ACTION_INTERVALS)[number];

export function nyxVroidMorphTargetFor(expression: NyxVroidExpression): string {
  return MORPH_TARGETS[expression];
}

export function nyxLocalizedLabel(
  value: Pick<
    ExperimentalVrmMotion | ExperimentalVrmMotionPack | ExperimentalVrmCharacter | ExperimentalVrmOutfit,
    'label' | 'labelZhTW'
  >,
  language: AppLanguage,
): string {
  return language === 'zh-TW' ? value.labelZhTW : value.label;
}

/**
 * Keep the person-facing name stable on the stage while making the reviewed
 * source revision explicit in the character-addition workbench.
 */
export function nyxVrmCharacterCatalogLabel(character: ExperimentalVrmCharacter, language: AppLanguage): string {
  return `${nyxLocalizedLabel(character, language)} · ${character.sourceRevision}`;
}

export function nyxVroidMotions(): readonly NyxVroidMotion[] {
  const motions: NyxVroidMotion[] = [];
  for (const motionPack of NYX_VROID_CHARACTER.motionPacks) {
    for (const motion of motionPack.motions) motions.push(motion);
  }
  return motions;
}

/**
 * Motions that can ship with CYBOARD. The Wonderful pack is intentionally absent:
 * its local-use license does not permit bundle distribution.
 */
export function nyxProductionVrmMotions(): readonly NyxVroidMotion[] {
  const motions: NyxVroidMotion[] = [];
  for (const motionPack of NYX_VROID_CHARACTER.motionPacks) {
    if (motionPack.availability !== 'production') continue;
    for (const motion of motionPack.motions) motions.push(motion);
  }
  return motions;
}

export function isNyxRuntimeMotionId(value: unknown): value is NyxRuntimeMotionId {
  return (
    value === NYX_REST_MOTION_ID ||
    (typeof value === 'string' && nyxProductionVrmMotions().some((motion) => motion.id === value))
  );
}

export function experimentalVrmCharacterFor(id: string | null): ExperimentalVrmCharacter {
  return EXPERIMENTAL_VRM_CHARACTERS.find((character) => character.id === id) ?? NYX_VROID_CHARACTER;
}

export function experimentalVrmAvailableOutfits(character: ExperimentalVrmCharacter): readonly ExperimentalVrmOutfit[] {
  return character.outfits.filter((outfit) => outfit.availability === 'available');
}

export function experimentalVrmOutfitFor(
  character: ExperimentalVrmCharacter,
  id: string | null,
): ExperimentalVrmOutfit {
  return (
    experimentalVrmAvailableOutfits(character).find((outfit) => outfit.id === id) ??
    character.outfits.find((outfit) => outfit.id === character.defaultOutfitId) ??
    character.outfits[0]!
  );
}

export function experimentalVrmMotionFor(character: ExperimentalVrmCharacter, id: string): ExperimentalVrmMotion {
  for (const motionPack of character.motionPacks) {
    const motion = motionPack.motions.find((candidate) => candidate.id === id);
    if (motion) return motion;
  }
  throw new Error(`Unknown experimental VRM motion: ${id}`);
}

export function nyxVroidMotionFor(id: NyxVroidMotionId): NyxVroidMotion {
  const motion = nyxVroidMotions().find((candidate) => candidate.id === id);
  if (!motion) throw new Error(`Unknown NYX VRoid motion: ${id}`);
  return motion;
}

export function nyxProductionVrmMotionFor(id: Exclude<NyxRuntimeMotionId, typeof NYX_REST_MOTION_ID>): NyxVroidMotion {
  const motion = nyxProductionVrmMotions().find((candidate) => candidate.id === id);
  if (!motion) throw new Error(`Unknown production NYX VRMA motion: ${id}`);
  return motion;
}

export const NYX_VROID_EXPERIMENT_EXPRESSIONS = Object.keys(MORPH_TARGETS) as NyxVroidExpression[];
