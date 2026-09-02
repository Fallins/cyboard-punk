import gateManifest from './nyx2dFaceOverlayGate.json';

export type Nyx2DFacialFeature = 'blink';
export type Nyx2DFaceGateStatus = 'blocked' | 'ready';

export interface Nyx2DFaceApprovedAsset {
  path: string;
  sha256: string;
  width: number;
  height: number;
  leftEyePx: [number, number];
  rightEyePx: [number, number];
}

interface FaceGateFeatureManifest {
  status: Nyx2DFaceGateStatus;
  reason: string;
  approvedAssets: Nyx2DFaceApprovedAsset[];
  requiredEvidence: string[];
}

interface FaceGateManifest {
  schemaVersion: number;
  policy: string;
  master: {
    width: number;
    height: number;
    sha256: string;
  };
  blink: FaceGateFeatureManifest;
}

const manifest = gateManifest as FaceGateManifest;

export function nyx2DFaceGateManifest(): Readonly<FaceGateManifest> {
  return manifest;
}

export function nyx2DFacialFeatureReady(feature: Nyx2DFacialFeature): boolean {
  const gate = manifest[feature];
  return gate.status === 'ready' && gate.approvedAssets.length > 0;
}

export function nyx2DFacialFeatureBlockReason(feature: Nyx2DFacialFeature): string | null {
  const gate = manifest[feature];
  return nyx2DFacialFeatureReady(feature) ? null : gate.reason;
}
