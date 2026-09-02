export interface Nyx2DMotionTuning {
  breath: number;
  gesture: number;
  stance: number;
  head: number;
}

export type Nyx2DMotionTuningKey = keyof Nyx2DMotionTuning;

export const NYX_2D_PRODUCTION_TUNING: Nyx2DMotionTuning = {
  // Breathing was already the only channel readable without close inspection.
  // Give it a modest production lift while the semantic channels remain at 1x.
  breath: 1.25,
  gesture: 1,
  stance: 1,
  head: 1,
};

export const NYX_2D_TEST_TUNING: Nyx2DMotionTuning = {
  // Deliberately exaggerated calibration defaults. These are only used while
  // NYX test controls are visible, making state differences easy to judge.
  breath: 1.35,
  gesture: 3,
  stance: 3,
  head: 2,
};

const LIMITS: Record<Nyx2DMotionTuningKey, readonly [number, number]> = {
  breath: [0, 2],
  gesture: [0, 5],
  stance: [0, 5],
  head: [0, 3],
};

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

export function nyx2DGestureCssVariables(scale: number): string {
  const s = clampNyx2DTuningValue('gesture', scale);
  const px = (value: number) => `${(value * s).toFixed(3)}px`;
  const deg = (value: number) => `${(value * s).toFixed(3)}deg`;

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
    `--nyx-focus-settle-x:${px(-0.2)}`,
    `--nyx-focus-settle-y:${px(0.8)}`,
    `--nyx-focus-settle-r:${deg(0.07)}`,
    `--nyx-alert-y:${px(-2.2)}`,
    `--nyx-alert-settle-y:${px(-0.7)}`,
    `--nyx-success-y:${px(-4)}`,
    `--nyx-success-settle-y:${px(-1.3)}`,
  ].join(';');
}
