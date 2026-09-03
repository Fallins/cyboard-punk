export interface Nyx2DMotionTuning {
  breath: number;
  arms: number;
  torso: number;
  head: number;
}

export type Nyx2DMotionTuningKey = keyof Nyx2DMotionTuning;

export const NYX_2D_PRODUCTION_TUNING: Nyx2DMotionTuning = {
  // User-validated at Dashboard scale.
  breath: 2,

  // Semantic forearm articulation.
  arms: 1,

  // 0.21 repurposes the existing internal key as the source-guided upper-body
  // intensity: local upper-arm mesh rotation + micro torso parallax. The hard
  // calibration envelope still clamps actual shoulder/torso motion.
  torso: 1,

  // Ambient anchored posture only; not a semantic state gesture.
  head: 1,
};

export const NYX_2D_TEST_TUNING: Nyx2DMotionTuning = {
  breath: 2,
  arms: 1,
  torso: 1,
  head: 1,
};

const LIMITS: Record<Nyx2DMotionTuningKey, readonly [number, number]> = {
  breath: [0, 2.5],
  arms: [0, 1.25],
  torso: [0, 1.5],
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
    arms: clampNyx2DTuningValue('arms', tuning?.arms ?? NYX_2D_PRODUCTION_TUNING.arms),
    torso: clampNyx2DTuningValue('torso', tuning?.torso ?? NYX_2D_PRODUCTION_TUNING.torso),
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
