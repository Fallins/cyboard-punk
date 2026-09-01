import type { OperatorMode, OperatorRuntimeState } from './operatorRuntime';

export interface OperatorAssetDefinition {
  id: 'nyx' | 'axon';
  mode: OperatorMode;
  displayName: 'NYX' | 'AXON';
  role: string;
  glbPath: string;
  posterPath: string;
  accent: {
    primary: string;
    secondary: string;
    core: string;
  };
  animationClips: Record<OperatorRuntimeState, readonly string[]>;
}

const COMMON_CLIPS: Record<OperatorRuntimeState, readonly string[]> = {
  idle: ['idle'],
  observing: ['observing', 'idle'],
  processing: ['processing', 'working', 'observing', 'idle'],
  warning: ['warning', 'observing', 'idle'],
  success: ['success', 'idle'],
  offline: ['offline', 'idle'],
};

export const OPERATOR_ASSETS: Record<OperatorMode, OperatorAssetDefinition> = {
  female: {
    id: 'nyx',
    mode: 'female',
    displayName: 'NYX',
    role: 'Signal Intelligence Operator',
    glbPath: '/operator/nyx/nyx.glb',
    posterPath: '/operator/nyx/poster.webp',
    accent: {
      primary: '#20F6FF',
      secondary: '#FF2FCF',
      core: '#8B5CFF',
    },
    animationClips: COMMON_CLIPS,
  },
  male: {
    id: 'axon',
    mode: 'male',
    displayName: 'AXON',
    role: 'Systems Operations Operator',
    glbPath: '/operator/axon/axon.glb',
    posterPath: '/operator/axon/poster.webp',
    accent: {
      primary: '#20F6FF',
      secondary: '#8B5CFF',
      core: '#FF2FCF',
    },
    animationClips: COMMON_CLIPS,
  },
};

export function operatorAsset(mode: OperatorMode): OperatorAssetDefinition {
  return OPERATOR_ASSETS[mode];
}

export function operatorAssetPath(mode: OperatorMode): string {
  return operatorAsset(mode).glbPath;
}

export function operatorPosterPath(mode: OperatorMode): string {
  return operatorAsset(mode).posterPath;
}

export function operatorAnimationCandidates(
  mode: OperatorMode,
  state: OperatorRuntimeState,
): readonly string[] {
  return operatorAsset(mode).animationClips[state];
}
