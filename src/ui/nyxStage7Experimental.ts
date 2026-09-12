import type { Nyx2DAttentionTarget } from './nyx2dAttention';
import type { OperatorRuntimeState } from './operatorRuntime';

export type NyxStage7RuntimeTier = 'production' | 'stage7-experimental';

export interface NyxStage7MotionSample {
  neckAngleDeg: number;
  torsoAngleDeg: number;
  gazeOffsetPx: number;
  blinkClosure: number;
  shoulderAngleDeg: number;
  elbowAngleDeg: number;
  wristAdditionalDeg: number;
  acknowledgementActive: boolean;
  breathAmount: number;
  chestRisePx: number;
  chestScaleX: number;
  chestScaleY: number;
  shoulderRisePx: number;
}

export interface NyxStage7MotionState {
  elapsedMs: number;
  lastSampleAtMs: number;
  paused: boolean;
  headAttentionMix: number;
  bodyAttentionMix: number;
  acknowledgementStartedAtMs: number | null;
  lastSemanticState: OperatorRuntimeState;
  lastSample: NyxStage7MotionSample;
}

export interface NyxStage7MotionInput {
  state: OperatorRuntimeState;
  attentionTarget: Nyx2DAttentionTarget;
  animate: boolean;
  forceNeutral: boolean;
}

export interface NyxStage7BreathSample {
  amount: number;
  chestRisePx: number;
  chestScaleX: number;
  chestScaleY: number;
  shoulderRisePx: number;
}

export const NYX_STAGE7_TARGET_FPS = 24;
export const NYX_STAGE7_MAX_LAYER_EQUIVALENT = {
  drawCalls: 11,
  triangles: 22,
  geometries: 11,
  textures: 2,
} as const;

const IDLE_DURATION_MS = 5_000;
const ACK_DURATION_MS = 1_400;
const BLINK_DURATION_MS = 310;
const BLINK_CYCLE_MS = 6_200;
const BLINK_START_MS = 4_800;
const HEAD_RESPONSE_MS = 280;
const BODY_RESPONSE_MS = 720;

// Stage 6 v02 breathing revalidation: 40% inhale, 8% hold,
// 45% exhale, 7% rest. The pelvis/legs do not participate. The amplitudes sit
// at the reviewed upper end of the product tuning range so the upper chest is
// readable at the actual Operator-panel scale without becoming a bounce.
const BREATH_ENVELOPE = [
  [0, 0],
  [2_000, 1],
  [2_400, 1],
  [4_650, 0],
  [5_000, 0],
] as const;
const BREATH_CHEST_RISE_PX = 1.5;
const BREATH_CHEST_SCALE_X = 0.006;
const BREATH_CHEST_SCALE_Y = 0.008;
const BREATH_SHOULDER_RISE_PX = 0.8;

const BLINK = [[0, 0], [95, 1], [150, 1], [310, 0]] as const;

// Stage 6 v02 acknowledgement revalidation. The shoulder clearly leads,
// the elbow follows, the wrist contribution is intentionally tiny, the pose
// briefly holds, and every channel settles monotonically without overshoot.
const ACK_NECK = [
  [0, 0], [160, 0.2], [320, 0.6], [500, 0.8], [620, 0.8], [860, 0.4], [1_120, 0.15], [1_400, 0],
] as const;
const ACK_TORSO = [
  [0, 0], [160, -0.08], [320, -0.24], [500, -0.35], [620, -0.35], [860, -0.2], [1_120, -0.08], [1_400, 0],
] as const;
const ACK_SHOULDER = [
  [0, 0], [160, -2.8], [320, -6.4], [500, -8], [620, -8], [860, -5], [1_120, -2], [1_400, 0],
] as const;
const ACK_ELBOW = [
  [0, 0], [160, -0.2], [320, -2], [500, -4.2], [620, -4.8], [860, -3.2], [1_120, -1.2], [1_400, 0],
] as const;
const ACK_WRIST = [
  [0, 0], [160, 0], [320, -0.1], [500, -0.5], [620, -0.7], [860, -0.4], [1_120, -0.15], [1_400, 0],
] as const;

type Keyframes = ReadonlyArray<readonly [number, number]>;

export function resolveNyxStage7RuntimeTier(value?: string | null): NyxStage7RuntimeTier {
  return value?.trim().toLowerCase() === 'stage7' ? 'stage7-experimental' : 'production';
}

export function neutralNyxStage7MotionSample(): NyxStage7MotionSample {
  return {
    neckAngleDeg: 0,
    torsoAngleDeg: 0,
    gazeOffsetPx: 0,
    blinkClosure: 0,
    shoulderAngleDeg: 0,
    elbowAngleDeg: 0,
    wristAdditionalDeg: 0,
    acknowledgementActive: false,
    breathAmount: 0,
    chestRisePx: 0,
    chestScaleX: 1,
    chestScaleY: 1,
    shoulderRisePx: 0,
  };
}

export function createNyxStage7MotionState(
  nowMs = 0,
  semanticState: OperatorRuntimeState = 'idle',
): NyxStage7MotionState {
  return {
    elapsedMs: 0,
    lastSampleAtMs: Math.max(0, nowMs),
    paused: false,
    headAttentionMix: 0,
    bodyAttentionMix: 0,
    acknowledgementStartedAtMs: null,
    lastSemanticState: semanticState,
    lastSample: neutralNyxStage7MotionSample(),
  };
}

function sampleKeyframes(keyframes: Keyframes, elapsedMs: number, smooth = false): number {
  const safeElapsed = Math.max(0, elapsedMs);
  if (safeElapsed <= keyframes[0][0]) return keyframes[0][1];
  for (let index = 1; index < keyframes.length; index += 1) {
    const current = keyframes[index];
    if (safeElapsed > current[0]) continue;
    const previous = keyframes[index - 1];
    const span = Math.max(1, current[0] - previous[0]);
    let amount = (safeElapsed - previous[0]) / span;
    if (smooth) amount = amount * amount * (3 - 2 * amount);
    return previous[1] + (current[1] - previous[1]) * amount;
  }
  return keyframes[keyframes.length - 1][1];
}

function attentionSide(target: Nyx2DAttentionTarget): -1 | 0 | 1 {
  if (target === 'cursor') return 1;
  if (target === 'codex' || target === 'claude') return -1;
  return 0;
}

function attentionStateScale(state: OperatorRuntimeState): number {
  switch (state) {
    case 'observing': return 1;
    case 'processing': return 0.92;
    case 'warning': return 0.86;
    case 'success': return 0.72;
    case 'idle': return 0.45;
    case 'offline':
    default: return 0;
  }
}

function dampingAmount(deltaMs: number, responseMs: number): number {
  const safeDelta = Math.max(0, Math.min(100, deltaMs));
  const tauMs = responseMs / 3;
  return safeDelta > 0 ? 1 - Math.exp(-safeDelta / tauMs) : 0;
}

export function sampleNyxStage7Breathing(elapsedMs: number): NyxStage7BreathSample {
  const cycleTime = ((Math.max(0, elapsedMs) % IDLE_DURATION_MS) + IDLE_DURATION_MS) % IDLE_DURATION_MS;
  const amount = sampleKeyframes(BREATH_ENVELOPE, cycleTime, true);
  return {
    amount,
    chestRisePx: amount * BREATH_CHEST_RISE_PX,
    chestScaleX: 1 + amount * BREATH_CHEST_SCALE_X,
    chestScaleY: 1 + amount * BREATH_CHEST_SCALE_Y,
    shoulderRisePx: amount * BREATH_SHOULDER_RISE_PX,
  };
}

export function sampleNyxStage7Acknowledgement(elapsedMs: number): NyxStage7MotionSample {
  const safeElapsed = Math.max(0, Math.min(ACK_DURATION_MS, elapsedMs));
  return {
    ...neutralNyxStage7MotionSample(),
    neckAngleDeg: sampleKeyframes(ACK_NECK, safeElapsed, true),
    torsoAngleDeg: sampleKeyframes(ACK_TORSO, safeElapsed, true),
    shoulderAngleDeg: sampleKeyframes(ACK_SHOULDER, safeElapsed, true),
    elbowAngleDeg: sampleKeyframes(ACK_ELBOW, safeElapsed, true),
    wristAdditionalDeg: sampleKeyframes(ACK_WRIST, safeElapsed, true),
    acknowledgementActive: safeElapsed < ACK_DURATION_MS,
  };
}

export function sampleNyxStage7Blink(elapsedMs: number): number {
  const cycleTime = ((Math.max(0, elapsedMs) % BLINK_CYCLE_MS) + BLINK_CYCLE_MS) % BLINK_CYCLE_MS;
  if (cycleTime < BLINK_START_MS || cycleTime > BLINK_START_MS + BLINK_DURATION_MS) return 0;
  return sampleKeyframes(BLINK, cycleTime - BLINK_START_MS, true);
}

export function stepNyxStage7Motion(
  runtime: NyxStage7MotionState,
  input: NyxStage7MotionInput,
  nowMs: number,
): NyxStage7MotionSample {
  const safeNow = Math.max(0, Number.isFinite(nowMs) ? nowMs : runtime.lastSampleAtMs);

  if (!input.animate) {
    runtime.lastSampleAtMs = safeNow;
    runtime.paused = true;
    runtime.lastSemanticState = input.state;
    runtime.acknowledgementStartedAtMs = null;
    if (input.forceNeutral) runtime.lastSample = neutralNyxStage7MotionSample();
    return runtime.lastSample;
  }

  const deltaMs = runtime.paused
    ? 0
    : Math.max(0, Math.min(100, safeNow - runtime.lastSampleAtMs));
  runtime.lastSampleAtMs = safeNow;
  runtime.paused = false;
  runtime.elapsedMs += deltaMs;

  if (input.state !== runtime.lastSemanticState) {
    if (input.state === 'success') runtime.acknowledgementStartedAtMs = runtime.elapsedMs;
    runtime.lastSemanticState = input.state;
  }

  const desiredSide = attentionSide(input.attentionTarget) * attentionStateScale(input.state);
  runtime.headAttentionMix +=
    (desiredSide - runtime.headAttentionMix) * dampingAmount(deltaMs, HEAD_RESPONSE_MS);
  runtime.bodyAttentionMix +=
    (desiredSide - runtime.bodyAttentionMix) * dampingAmount(deltaMs, BODY_RESPONSE_MS);

  if (runtime.acknowledgementStartedAtMs !== null) {
    const acknowledgementElapsed = runtime.elapsedMs - runtime.acknowledgementStartedAtMs;
    if (acknowledgementElapsed < ACK_DURATION_MS) {
      runtime.lastSample = sampleNyxStage7Acknowledgement(acknowledgementElapsed);
      return runtime.lastSample;
    }
    runtime.acknowledgementStartedAtMs = null;
  }

  const breathing = sampleNyxStage7Breathing(runtime.elapsedMs);
  runtime.lastSample = {
    neckAngleDeg: runtime.headAttentionMix * 2.2,
    torsoAngleDeg: runtime.bodyAttentionMix * -0.55,
    gazeOffsetPx: runtime.headAttentionMix,
    blinkClosure: sampleNyxStage7Blink(runtime.elapsedMs),
    shoulderAngleDeg: 0,
    elbowAngleDeg: 0,
    wristAdditionalDeg: 0,
    acknowledgementActive: false,
    breathAmount: breathing.amount,
    chestRisePx: breathing.chestRisePx,
    chestScaleX: breathing.chestScaleX,
    chestScaleY: breathing.chestScaleY,
    shoulderRisePx: breathing.shoulderRisePx,
  };
  return runtime.lastSample;
}
