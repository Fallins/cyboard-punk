import manifestJson from './operator-manifest.json';
import type { OperatorMode, OperatorRuntimeState } from './operatorRuntime';

export interface OperatorAssetDefinition {
  id: 'axon';
  mode: 'male';
  displayName: 'AXON';
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
  mode: 'male';
  displayName: 'AXON';
  role: string;
  glb: string;
  poster: string;
  accent: OperatorAssetDefinition['accent'];
  animationClips: string[];
}

interface OperatorManifest {
  schemaVersion: number;
  operators: {
    axon: ManifestOperator;
  };
}

const manifest = manifestJson as OperatorManifest;

const axonAsset: OperatorAssetDefinition = {
  id: 'axon',
  mode: manifest.operators.axon.mode,
  displayName: manifest.operators.axon.displayName,
  role: manifest.operators.axon.role,
  glbPath: manifest.operators.axon.glb,
  posterPath: manifest.operators.axon.poster,
  accent: manifest.operators.axon.accent,
  animationClips: manifest.operators.axon.animationClips,
};

export const OPERATOR_ASSETS: Readonly<Partial<Record<OperatorMode, OperatorAssetDefinition>>> = {
  male: axonAsset,
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
  const asset = OPERATOR_ASSETS[mode];
  if (!asset) throw new Error('NYX has no GLB/3D asset; the production NYX renderer is 2D-only');
  return asset;
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
