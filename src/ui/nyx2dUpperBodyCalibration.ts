import { NYX_2D_MASTER } from './nyx2dRig';

export type Nyx2DBodySide = 'left' | 'right';

export interface Nyx2DSourcePoint {
  x: number;
  y: number;
}

export interface Nyx2DUpperArmCalibration {
  shoulder: Nyx2DSourcePoint;
  elbow: Nyx2DSourcePoint;
  influenceRadiusPx: number;
  featherPx: number;
  shoulderCapRadiusPx: number;
  shoulderCapFeatherPx: number;
  shoulderInwardAllowancePx: number;
}

/**
 * Phase-2 upper-body calibration.
 *
 * Visible RGB always remains the canonical 941x1672 master. The approved
 * orthographic/detail references are used only to constrain anatomy, pivots and
 * safe motion ranges; they are never swapped into the renderer as alternate art.
 */
export const NYX_2D_UPPER_BODY_CALIBRATION = {
  referenceLock: {
    orthographic: {
      width: 1448,
      height: 1086,
      sha256: '0ae82526d703049ebc1bf63c273dfd0f44a787134f24c3f0b7fc985ac19ed9df',
    },
    detailSheet: {
      width: 1536,
      height: 1024,
      sha256: '5d1add76b3a6355c493923fefa59e91d859e63756d64a37050426c8c87f8412c',
    },
  },
  master: {
    width: NYX_2D_MASTER.width,
    height: NYX_2D_MASTER.height,
  },
  left: {
    shoulder: { x: 365, y: 350 },
    elbow: { x: 307, y: 590 },
    influenceRadiusPx: 58,
    featherPx: 22,
    shoulderCapRadiusPx: 64,
    shoulderCapFeatherPx: 24,
    shoulderInwardAllowancePx: 28,
  },
  right: {
    shoulder: { x: 575, y: 350 },
    elbow: { x: 625, y: 580 },
    influenceRadiusPx: 58,
    featherPx: 22,
    shoulderCapRadiusPx: 64,
    shoulderCapFeatherPx: 24,
    shoulderInwardAllowancePx: 28,
  },
  limits: {
    shoulderDeg: 7,
    // Full shoulder engagement at the hard angular limit moves the deltoid only
    // a few source pixels at dashboard scale. This is enough to read as a living
    // shoulder without inventing hidden armpit/chest pixels.
    shoulderLiftWorld: 0.006,
    shoulderInwardWorld: 0.0022,
    torsoYaw: 0.16,
    torsoShiftX: 0.003,
    torsoLeanDeg: 0.6,
  },
} as const;

export function nyx2DUpperArmCalibration(side: Nyx2DBodySide): Nyx2DUpperArmCalibration {
  return NYX_2D_UPPER_BODY_CALIBRATION[side];
}

export function clampNyx2DShoulderDeg(value: number): number {
  const limit = NYX_2D_UPPER_BODY_CALIBRATION.limits.shoulderDeg;
  return Math.max(-limit, Math.min(limit, Number.isFinite(value) ? value : 0));
}

export function clampNyx2DTorsoYaw(value: number): number {
  const limit = NYX_2D_UPPER_BODY_CALIBRATION.limits.torsoYaw;
  return Math.max(-limit, Math.min(limit, Number.isFinite(value) ? value : 0));
}

export function clampNyx2DTorsoShiftX(value: number): number {
  const limit = NYX_2D_UPPER_BODY_CALIBRATION.limits.torsoShiftX;
  return Math.max(-limit, Math.min(limit, Number.isFinite(value) ? value : 0));
}

export function clampNyx2DTorsoLeanDeg(value: number): number {
  const limit = NYX_2D_UPPER_BODY_CALIBRATION.limits.torsoLeanDeg;
  return Math.max(-limit, Math.min(limit, Number.isFinite(value) ? value : 0));
}
