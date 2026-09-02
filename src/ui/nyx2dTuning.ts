export interface Nyx2DMotionTuning {
  breath: number;
  gesture: number;
  stance: number;
  head: number;
}

export type Nyx2DMotionTuningKey = keyof Nyx2DMotionTuning;

export const NYX_2D_PRODUCTION_TUNING: Nyx2DMotionTuning = {
  // User-validated: breathing is clearly readable at Dashboard scale and 2x
  // remains anatomically acceptable with the weighted torso geometry.
  breath: 2,

  // Retired from production. These were whole-sprite translate/scale/rotate
  // approximations and do not qualify as semantic 2.5D character gestures.
  // Keep the debug channels addressable until the articulated rig replaces them.
  gesture: 0,
  stance: 0,

  // Preserve the already-approved tiny anchored head posture as ambient life,
  // not as a state-specific gesture system.
  head: 1,
};

export const NYX_2D_TEST_TUNING: Nyx2DMotionTuning = {
  // Test controls now start from the honest production baseline. Legacy whole-
  // sprite gesture/stance sliders remain available only for diagnostics and A/B,
  // but no longer turn themselves on when test controls are enabled.
  breath: 2,
  gesture: 0,
  stance: 0,
  head: 1,
};

const LIMITS: Record<Nyx2DMotionTuningKey, readonly [number, number]> = {
  breath: [0, 2],
  gesture: [0, 5],
  stance: [0, 5],
  head: [0, 3],
};

let runtimeTuning: Nyx2DMotionTuning = { ...NYX_2D_PRODUCTION_TUNING };

export function clampNyx2DTuningValue(key: Nyx2DMotionTuningKey, value: number): number {
  const [min, max] = LIMITS[key];
  const finite = Number.isFinite(value) ? value : NYX_2D_PRODUCTION_TUNING[key];
  return Math.min(max, Math.max(min, finite));
}

export function resolveNyx2DMotionTuning(
  tuning?: Partial<Nyx2DMotionTuning> | null,
): Nyx2DMotionTuning {
  return {
    breath: clampNyx2DTuningValue('breath', tuning?.breath ?? NYX_2D_PRODUCTION_TUNING.breath),
    gesture: clampNyx2DTuningValue('gesture', tuning?.gesture ?? NYX_2D_PRODUCTION_TUNING.gesture),
    stance: clampNyx2DTuningValue('stance', tuning?.stance ?? NYX_2D_PRODUCTION_TUNING.stance),
    head: clampNyx2DTuningValue('head', tuning?.head ?? NYX_2D_PRODUCTION_TUNING.head),
  };
}

export function setNyx2DRuntimeTuning(tuning?: Partial<Nyx2DMotionTuning> | null): Nyx2DMotionTuning {
  runtimeTuning = resolveNyx2DMotionTuning(tuning);
  return runtimeTuning;
}

export function nyx2DRuntimeTuning(): Readonly<Nyx2DMotionTuning> {
  return runtimeTuning;
}

export function resetNyx2DRuntimeTuning(): Nyx2DMotionTuning {
  runtimeTuning = { ...NYX_2D_PRODUCTION_TUNING };
  return runtimeTuning;
}

/**
 * Legacy whole-sprite entry gesture calibration variables.
 *
 * Production resolves gesture=0. These variables stay only so the previous
 * implementation can be compared during articulated-rig development; they must
 * not be promoted back to semantic production gestures.
 */
export function nyx2DGestureCssVariables(scale: number): string {
  const s = clampNyx2DTuningValue('gesture', scale);
  const px = (value: number) => `${(value * s).toFixed(3)}px`;
  const deg = (value: number) => `${(value * s).toFixed(3)}deg`;
  const aroundOne = (delta: number) => (1 + delta * s).toFixed(4);

  return [
    `--nyx-attention-x:${px(1)}`,
    `--nyx-attention-y:${px(-3)}`,
    `--nyx-attention-r:${deg(-0.34)}`,
    `--nyx-attention-settle-x:${px(0.35)}`,
    `--nyx-attention-settle-y:${px(-1)}`,
    `--nyx-attention-settle-r:${deg(-0.12)}`,
    `--nyx-focus-x:${px(-0.6)}`,
    `--nyx-focus-y:${px(2.6)}`,
    `--nyx-focus-r:${deg(0.2)}`,
    `--nyx-focus-scale-y:${aroundOne(-0.005)}`,
    `--nyx-focus-settle-x:${px(-0.2)}`,
    `--nyx-focus-settle-y:${px(0.8)}`,
    `--nyx-focus-settle-r:${deg(0.07)}`,
    `--nyx-focus-settle-scale-y:${aroundOne(-0.0015)}`,
    `--nyx-alert-y:${px(-2.2)}`,
    `--nyx-alert-scale-x:${aroundOne(0.009)}`,
    `--nyx-alert-settle-y:${px(-0.7)}`,
    `--nyx-alert-settle-scale-x:${aroundOne(0.003)}`,
    `--nyx-success-y:${px(-4)}`,
    `--nyx-success-scale:${aroundOne(0.006)}`,
    `--nyx-success-settle-y:${px(-1.3)}`,
    `--nyx-success-settle-scale:${aroundOne(0.002)}`,
  ].join(';');
}
