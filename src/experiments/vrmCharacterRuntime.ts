export const REQUIRED_VRM_HUMANOID_BONES = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot',
] as const;

import {
  VRM_PRESET_EXPRESSIONS,
  type NyxVrmExpressionId,
  type VrmPresetExpression,
} from './nyxVrmExpressions';

export type { VrmPresetExpression } from './nyxVrmExpressions';

export type ExperimentalVrmMotion = {
  readonly id: string;
  readonly label: string;
  readonly labelZhTW: string;
  readonly assetPath: string;
  readonly sourceName?: string;
  readonly face?: {
    readonly expression: NyxVrmExpressionId;
    readonly intensity: number;
  };
};

export type ExperimentalVrmMotionPack = {
  readonly id: string;
  readonly label: string;
  readonly labelZhTW: string;
  readonly sourceArchiveSha256?: string;
  /** Reproducible project-owned source when a pack is authored in this repository. */
  readonly authoredSource?: string;
  readonly attribution: string;
  /** Only production packs may be selected by persisted CYBOARD settings. */
  readonly availability: 'production' | 'local-development';
  readonly redistributionNote?: string;
  readonly motions: readonly ExperimentalVrmMotion[];
};

export type ExperimentalVrmOutfit = {
  readonly id: string;
  readonly label: string;
  readonly labelZhTW: string;
  /** Only an available, baked variation can be selected by the runtime. */
  readonly availability: 'available' | 'requires-vroid-source';
  readonly sourceUrl?: string;
  readonly note?: string;
};

export type ExperimentalVrmCharacter = {
  readonly id: string;
  readonly label: string;
  readonly labelZhTW: string;
  readonly assetPath: string;
  readonly sourceSha256: string;
  readonly production: boolean;
  readonly vrmVersion: '0.x' | '1.0';
  readonly faceForward: '+Z' | '-Z';
  readonly targetHeight: number;
  readonly defaultOutfitId: string;
  readonly outfits: readonly ExperimentalVrmOutfit[];
  readonly motionPacks: readonly ExperimentalVrmMotionPack[];
};

export type VrmRuntimeProbe = {
  readonly hasRawBone: (name: string) => boolean;
  readonly hasExpression: (name: VrmPresetExpression) => boolean;
};

export type ExperimentalVrmCapability = {
  readonly animationReady: boolean;
  readonly missingHumanoidBones: readonly string[];
  readonly availableExpressions: readonly VrmPresetExpression[];
};

export function assessExperimentalVrmCapability(runtime: VrmRuntimeProbe): ExperimentalVrmCapability {
  const missingHumanoidBones = REQUIRED_VRM_HUMANOID_BONES.filter(
    (bone) => !runtime.hasRawBone(bone),
  );
  const availableExpressions = VRM_PRESET_EXPRESSIONS
    .filter((expression) => runtime.hasExpression(expression));

  return {
    animationReady: missingHumanoidBones.length === 0,
    missingHumanoidBones,
    availableExpressions,
  };
}
