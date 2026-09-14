import { VRMExpression, VRMExpressionMorphTargetBind, type VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';

export const VRM_PRESET_EXPRESSIONS = [
  'neutral',
  'happy',
  'angry',
  'sad',
  'relaxed',
  'surprised',
  'blink',
  'aa',
  'ih',
  'ou',
  'ee',
  'oh',
] as const;

export type VrmPresetExpression = (typeof VRM_PRESET_EXPRESSIONS)[number];

type NyxVrmSourceMorphTarget =
  | 'Fcl_BRW_Fun'
  | 'Fcl_BRW_Joy'
  | 'Fcl_BRW_Sorrow'
  | 'Fcl_BRW_Surprised'
  | 'Fcl_EYE_Fun'
  | 'Fcl_EYE_Joy'
  | 'Fcl_EYE_Sorrow'
  | 'Fcl_EYE_Surprised'
  | 'Fcl_MTH_Fun'
  | 'Fcl_MTH_Joy'
  | 'Fcl_MTH_Small'
  | 'Fcl_MTH_Surprised';

export type NyxVrmCustomExpression = {
  readonly id: string;
  readonly label: string;
  readonly morphs: readonly {
    readonly target: NyxVrmSourceMorphTarget;
    readonly weight: number;
  }[];
};

/**
 * These are new combinations of morph targets embedded in the approved NYX
 * model. They are not imported expression data or copied facial choreography.
 */
export const NYX_VRM_CUSTOM_EXPRESSIONS = [
  {
    id: 'nyxSoftSmile',
    label: 'Soft smile',
    morphs: [
      { target: 'Fcl_BRW_Fun', weight: 0.32 },
      { target: 'Fcl_EYE_Fun', weight: 0.35 },
      { target: 'Fcl_MTH_Fun', weight: 0.72 },
    ],
  },
  {
    id: 'nyxWarmGaze',
    label: 'Warm gaze',
    morphs: [
      { target: 'Fcl_BRW_Joy', weight: 0.28 },
      { target: 'Fcl_EYE_Joy', weight: 0.36 },
      { target: 'Fcl_MTH_Joy', weight: 0.78 },
    ],
  },
  {
    id: 'nyxBashful',
    label: 'Bashful',
    morphs: [
      { target: 'Fcl_BRW_Sorrow', weight: 0.22 },
      { target: 'Fcl_EYE_Fun', weight: 0.32 },
      { target: 'Fcl_MTH_Small', weight: 0.8 },
    ],
  },
  {
    id: 'nyxGentleSurprise',
    label: 'Gentle surprise',
    morphs: [
      { target: 'Fcl_BRW_Surprised', weight: 0.42 },
      { target: 'Fcl_EYE_Surprised', weight: 0.42 },
      { target: 'Fcl_MTH_Surprised', weight: 0.68 },
    ],
  },
] as const satisfies readonly NyxVrmCustomExpression[];

export type NyxVrmCustomExpressionId = (typeof NYX_VRM_CUSTOM_EXPRESSIONS)[number]['id'];
export type NyxVrmExpressionId = VrmPresetExpression | NyxVrmCustomExpressionId;

export function nyxVrmCustomExpressionFor(id: NyxVrmCustomExpressionId): NyxVrmCustomExpression {
  const expression = NYX_VRM_CUSTOM_EXPRESSIONS.find((candidate) => candidate.id === id);
  if (!expression) throw new Error(`Unknown NYX custom expression: ${id}`);
  return expression;
}

export function isNyxVrmExpressionId(value: unknown): value is NyxVrmExpressionId {
  return typeof value === 'string'
    && (VRM_PRESET_EXPRESSIONS.includes(value as VrmPresetExpression)
      || NYX_VRM_CUSTOM_EXPRESSIONS.some((expression) => expression.id === value));
}

function primitivesForMorphTarget(root: THREE.Object3D, target: NyxVrmSourceMorphTarget): Map<number, THREE.Mesh[]> {
  const primitives = new Map<number, THREE.Mesh[]>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !Array.isArray(object.morphTargetInfluences)) return;
    const index = object.morphTargetDictionary?.[target];
    if (typeof index !== 'number') return;
    const group = primitives.get(index) ?? [];
    group.push(object);
    primitives.set(index, group);
  });
  return primitives;
}

/** Registers only custom expressions whose source morph targets all exist on the loaded model. */
export function registerNyxVrmCustomExpressions(vrm: VRM): readonly NyxVrmCustomExpressionId[] {
  const manager = vrm.expressionManager;
  if (!manager) return [];

  const available: NyxVrmCustomExpressionId[] = [];
  for (const definition of NYX_VRM_CUSTOM_EXPRESSIONS) {
    if (manager.getExpression(definition.id)) {
      available.push(definition.id);
      continue;
    }

    const sourceBinds = definition.morphs.map((morph) => ({
      ...morph,
      primitives: primitivesForMorphTarget(vrm.scene, morph.target),
    }));
    if (sourceBinds.some((bind) => bind.primitives.size === 0)) continue;

    const expression = new VRMExpression(definition.id);
    for (const bind of sourceBinds) {
      for (const [index, primitives] of bind.primitives) {
        expression.addBind(new VRMExpressionMorphTargetBind({ index, primitives, weight: bind.weight }));
      }
    }
    vrm.scene.add(expression);
    manager.registerExpression(expression);
    available.push(definition.id);
  }
  return available;
}
