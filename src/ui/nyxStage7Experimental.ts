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

const IDLE_NECK = [[0, 0], [1250, 0.35], [2500, 0.55], [3750, 0.25], [5000, 0]] as const;
const IDLE_TORSO = [[0, 0], [1250, -0.35], [2500, -0.55], [3750, -0.25], [5000, 0]] as const;
const BLINK = [[0, 0], [95, 1], [150, 1], [310, 0]] as const;
const ACK_NECK = [[0, 0], [180, 0.5], [420, 1.4], [560, 1.6], [820, 0.9], [1100, 0.35], [1400, 0]] as const;
const ACK_TORSO = [[0, 0], [180, -0.25], [420, -0.7], [560, -0.9], [820, -0.45], [1100, -0.18], [1400, 0]] as const;
const ACK_SHOULDER = [[0, 0], [180, -5], [420, -12], [560, -14], [820, -7], [1100, -2.5], [1400, 0]] as const;
const ACK_ELBOW = [[0, 0], [180, -1.5], [420, -7], [560, -10], [820, -6], [1100, -2], [1400, 0]] as const;
const ACK_WRIST = [[0, 0], [180, 0], [420, -1.5], [560, -3], [820, -1.8], [1100, -0.7], [1400, 0]] as const;

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

function sampleKeyframes(keyframes: Keyframes, elapsedMs: number): number {
  const safeElapsed = Math.max(0, elapsedMs);
  if (safeElapsed <= keyframes[0][0]) return keyframes[0][1];
  for (let index = 1; index < keyframes.length; index += 1) {
    const current = keyframes[index];
    if (safeElapsed > current[0]) continue;
    const previous = keyframes[index - 1];
    const span = Math.max(1, current[0] - previous[0]);
    const amount = (safeElapsed - previous[0]) / span;
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

export function sampleNyxStage7Acknowledgement(elapsedMs: number): NyxStage7MotionSample {
  const safeElapsed = Math.max(0, Math.min(ACK_DURATION_MS, elapsedMs));
  return {
    neckAngleDeg: sampleKeyframes(ACK_NECK, safeElapsed),
    torsoAngleDeg: sampleKeyframes(ACK_TORSO, safeElapsed),
    gazeOffsetPx: 0,
    blinkClosure: 0,
    shoulderAngleDeg: sampleKeyframes(ACK_SHOULDER, safeElapsed),
    elbowAngleDeg: sampleKeyframes(ACK_ELBOW, safeElapsed),
    wristAdditionalDeg: sampleKeyframes(ACK_WRIST, safeElapsed),
    acknowledgementActive: safeElapsed < ACK_DURATION_MS,
  };
}

export function sampleNyxStage7Blink(elapsedMs: number): number {
  const cycleTime = ((Math.max(0, elapsedMs) % BLINK_CYCLE_MS) + BLINK_CYCLE_MS) % BLINK_CYCLE_MS;
  if (cycleTime < BLINK_START_MS || cycleTime > BLINK_START_MS + BLINK_DURATION_MS) return 0;
  return sampleKeyframes(BLINK, cycleTime - BLINK_START_MS);
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

  const breathingElapsed = runtime.elapsedMs % IDLE_DURATION_MS;
  const hasAttention = Math.abs(runtime.headAttentionMix) > 0.002 || Math.abs(runtime.bodyAttentionMix) > 0.002;
  runtime.lastSample = {
    neckAngleDeg: hasAttention
      ? runtime.headAttentionMix * 2.2
      : sampleKeyframes(IDLE_NECK, breathingElapsed),
    torsoAngleDeg: hasAttention
      ? runtime.bodyAttentionMix * -0.55
      : sampleKeyframes(IDLE_TORSO, breathingElapsed),
    gazeOffsetPx: runtime.headAttentionMix,
    blinkClosure: sampleNyxStage7Blink(runtime.elapsedMs),
    shoulderAngleDeg: 0,
    elbowAngleDeg: 0,
    wristAdditionalDeg: 0,
    acknowledgementActive: false,
  };
  return runtime.lastSample;
}
