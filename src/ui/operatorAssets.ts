import manifestJson from './operator-manifest.json';
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
  animationClips: readonly string[];
}

interface ManifestOperator {
  mode: OperatorMode;
  displayName: 'NYX' | 'AXON';
  role: string;
  glb: string;
  poster: string;
  accent: OperatorAssetDefinition['accent'];
  animationClips: string[];
}

interface OperatorManifest {
  schemaVersion: number;
  operators: {
    nyx: ManifestOperator;
    axon: ManifestOperator;
  };
}

const manifest = manifestJson as OperatorManifest;

function toDefinition(id: 'nyx' | 'axon', source: ManifestOperator): OperatorAssetDefinition {
  return {
    id,
    mode: source.mode,
    displayName: source.displayName,
    role: source.role,
    glbPath: source.glb,
    posterPath: source.poster,
    accent: source.accent,
    animationClips: source.animationClips,
  };
}

export const OPERATOR_ASSETS: Record<OperatorMode, OperatorAssetDefinition> = {
  female: toDefinition('nyx', manifest.operators.nyx),
  male: toDefinition('axon', manifest.operators.axon),
};

const CLIP_FALLBACKS: Record<OperatorRuntimeState, readonly string[]> = {
  idle: ['idle'],
  observing: ['observing', 'idle'],
  processing: ['processing', 'working', 'observing', 'idle'],
  warning: ['warning', 'observing', 'idle'],
  success: ['success', 'idle'],
  offline: ['offline', 'idle'],
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

export function operatorAnimationCandidates(state: OperatorRuntimeState): readonly string[] {
  return CLIP_FALLBACKS[state];
}
