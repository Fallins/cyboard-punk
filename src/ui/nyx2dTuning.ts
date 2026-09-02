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

  // 0.19.1 semantic articulation is elbow-down only. The key remains `arms`
  // internally for settings/test compatibility, but it now scales forearms only.
  arms: 1,

  // Retired until a clean multi-view/source-backed torso rig exists. The previous
  // squeeze/yaw approximation created visible shoulder/body separation.
  torso: 0,

  // Ambient anchored posture only; not a semantic state gesture.
  head: 1,
};

export const NYX_2D_TEST_TUNING: Nyx2DMotionTuning = {
  breath: 2,
  arms: 1,
  torso: 0,
  head: 1,
};

const LIMITS: Record<Nyx2DMotionTuningKey, readonly [number, number]> = {
  breath: [0, 2.5],
  arms: [0, 1.25],
  torso: [0, 0],
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
    torso: 0,
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
