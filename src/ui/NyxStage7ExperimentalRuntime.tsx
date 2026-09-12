import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { nyx2DRuntimeAttentionTarget } from './nyx2dAttention';
import {
  NYX_STAGE7_ARM_BASE_REMOVAL_D,
  NYX_STAGE7_ARM_REGION_D,
  NYX_STAGE7_CANVAS_WIDTH,
  NYX_STAGE7_CHEST_REGION_D,
  NYX_STAGE7_CORE_REGION_D,
  NYX_STAGE7_EYE_APERTURES_D,
  NYX_STAGE7_FOREARM_REGION_D,
  NYX_STAGE7_HAND_REGION_D,
  NYX_STAGE7_HEAD_REGION_D,
  NYX_STAGE7_SHOULDER_REGION_D,
  NYX_STAGE7_SILHOUETTE_BASE_D,
  NYX_STAGE7_SILHOUETTE_RIGHT_ARM_D,
  NYX_STAGE7_SOURCE_HEIGHT,
  NYX_STAGE7_SOURCE_OFFSET_X,
  NYX_STAGE7_SOURCE_WIDTH,
  NYX_STAGE7_TORSO_REGION_D,
} from './nyxStage7Geometry';
import {
  createNyxStage7MotionState,
  neutralNyxStage7MotionSample,
  NYX_STAGE7_MAX_LAYER_EQUIVALENT,
  NYX_STAGE7_TARGET_FPS,
  sampleNyxStage7Acknowledgement,
  sampleNyxStage7Breathing,
  stepNyxStage7Motion,
  type NyxStage7MotionSample,
} from './nyxStage7Experimental';
import type { OperatorRuntimeState } from './operatorRuntime';

interface NyxStage7ExperimentalRuntimeProps {
  state: OperatorRuntimeState;
  active: boolean;
  reducedMotion: boolean;
  onUnavailable: (reason: string) => void;
}

export const nyxStage7FrontPath = new URL(
  '../../assets/operator/nyx-redesign/references/stage-01/front.webp',
  import.meta.url,
).href;

const FRAME_INTERVAL_MS = 1000 / NYX_STAGE7_TARGET_FPS;

function harnessCaptureMode(): string | null {
  if (typeof window === 'undefined' || !window.location.pathname.endsWith('/stage7-runtime.html')) {
    return null;
  }
  return new URLSearchParams(window.location.search).get('capture');
}

function withBreath(sample: NyxStage7MotionSample, elapsedMs: number): NyxStage7MotionSample {
  const breathing = sampleNyxStage7Breathing(elapsedMs);
  return {
    ...sample,
    breathAmount: breathing.amount,
    chestRisePx: breathing.chestRisePx,
    chestScaleX: breathing.chestScaleX,
    chestScaleY: breathing.chestScaleY,
    shoulderRisePx: breathing.shoulderRisePx,
  };
}

function applyHarnessCaptureOverride(
  sample: NyxStage7MotionSample,
  captureMode: string | null,
): NyxStage7MotionSample {
  if (!captureMode) return sample;
  const neutral = neutralNyxStage7MotionSample();
  switch (captureMode) {
    case 'neutral':
    case 'breath-exhale':
      return neutral;
    case 'breath-mid-inhale':
      return withBreath(neutral, 1_000);
    case 'breath-peak-inhale':
      return withBreath(neutral, 2_200);
    case 'blink-0': return { ...neutral, blinkClosure: 0 };
    case 'blink-25': return { ...neutral, blinkClosure: 0.25 };
    case 'blink-50': return { ...neutral, blinkClosure: 0.5 };
    case 'blink-75': return { ...neutral, blinkClosure: 0.75 };
    case 'blink-100': return { ...neutral, blinkClosure: 1 };
    case 'ack-start': return sampleNyxStage7Acknowledgement(160);
    case 'ack-mid': return sampleNyxStage7Acknowledgement(320);
    case 'ack-peak': return sampleNyxStage7Acknowledgement(620);
    case 'ack-settle': return sampleNyxStage7Acknowledgement(1_120);
    default: return sample;
  }
}

export default function NyxStage7ExperimentalRuntime(props: NyxStage7ExperimentalRuntimeProps) {
  let host!: HTMLDivElement;
  const [motion, setMotion] = createSignal<NyxStage7MotionSample>(neutralNyxStage7MotionSample());
  const runtime = createNyxStage7MotionState(
    typeof performance === 'undefined' ? 0 : performance.now(),
    props.state,
  );
  const captureMode = harnessCaptureMode();
  let rafId = 0;
  let lastFrameAt = 0;
  let disposed = false;

  const shouldAnimate = () => props.active && !props.reducedMotion && props.state !== 'offline';
  const shouldForceNeutral = () => props.reducedMotion || props.state === 'offline';

  const publishDiagnostics = (
    renderMs: number,
    attentionTarget: string,
    sample: NyxStage7MotionSample,
  ) => {
    if (!host) return;
    host.dataset.drawCalls = String(NYX_STAGE7_MAX_LAYER_EQUIVALENT.drawCalls);
    host.dataset.triangles = String(NYX_STAGE7_MAX_LAYER_EQUIVALENT.triangles);
    host.dataset.geometries = String(NYX_STAGE7_MAX_LAYER_EQUIVALENT.geometries);
    host.dataset.textures = String(NYX_STAGE7_MAX_LAYER_EQUIVALENT.textures);
    host.dataset.renderSubmitMs = renderMs.toFixed(3);
    host.dataset.performanceSource = 'svg-source-layer-equivalent-unverified-render-time';
    host.dataset.state = props.state;
    host.dataset.attentionTarget = attentionTarget;
    host.dataset.neckDeg = sample.neckAngleDeg.toFixed(4);
    host.dataset.torsoDeg = sample.torsoAngleDeg.toFixed(4);
    host.dataset.gazePx = sample.gazeOffsetPx.toFixed(4);
    host.dataset.blink = sample.blinkClosure.toFixed(4);
    host.dataset.ack = sample.acknowledgementActive ? 'active' : 'idle';
    host.dataset.shoulderDeg = sample.shoulderAngleDeg.toFixed(4);
    host.dataset.elbowDeg = sample.elbowAngleDeg.toFixed(4);
    host.dataset.wristDeg = sample.wristAdditionalDeg.toFixed(4);
    host.dataset.breath = sample.breathAmount.toFixed(4);
    host.dataset.chestRisePx = sample.chestRisePx.toFixed(4);
    host.dataset.chestScaleX = sample.chestScaleX.toFixed(5);
    host.dataset.chestScaleY = sample.chestScaleY.toFixed(5);
    host.dataset.shoulderRisePx = sample.shoulderRisePx.toFixed(4);
    if (captureMode) host.dataset.captureMode = captureMode;
    else delete host.dataset.captureMode;
  };

  const sampleNow = (now: number) => {
    const attentionTarget = nyx2DRuntimeAttentionTarget();
    const started = performance.now();
    const live = stepNyxStage7Motion(runtime, {
      state: props.state,
      attentionTarget,
      animate: shouldAnimate(),
      forceNeutral: shouldForceNeutral(),
    }, now);
    const next = applyHarnessCaptureOverride(live, captureMode);
    setMotion({ ...next });
    publishDiagnostics(Math.max(0, performance.now() - started), attentionTarget, next);
  };

  const stopLoop = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastFrameAt = 0;
  };

  const ensureLoop = () => {
    if (!shouldAnimate()) {
      stopLoop();
      sampleNow(performance.now());
      return;
    }
    if (rafId) return;

    const tick = (now: number) => {
      if (disposed || !shouldAnimate()) {
        rafId = 0;
        sampleNow(now);
        return;
      }
      rafId = requestAnimationFrame(tick);
      if (lastFrameAt && now - lastFrameAt < FRAME_INTERVAL_MS) return;
      lastFrameAt = now;
      sampleNow(now);
    };
    rafId = requestAnimationFrame(tick);
  };

  onMount(() => {
    const sourceImage = new Image();
    sourceImage.decoding = 'async';
    sourceImage.onload = () => {
      if (
        sourceImage.naturalWidth !== NYX_STAGE7_SOURCE_WIDTH ||
        sourceImage.naturalHeight !== NYX_STAGE7_SOURCE_HEIGHT
      ) {
        props.onUnavailable(
          `NYX Stage 7 REF-FRONT decoded as ${sourceImage.naturalWidth}x${sourceImage.naturalHeight}; expected ${NYX_STAGE7_SOURCE_WIDTH}x${NYX_STAGE7_SOURCE_HEIGHT}`,
        );
      }
    };
    sourceImage.onerror = () => props.onUnavailable(`NYX Stage 7 REF-FRONT unavailable: ${nyxStage7FrontPath}`);
    sourceImage.src = nyxStage7FrontPath;

    sampleNow(performance.now());
    ensureLoop();

    onCleanup(() => {
      disposed = true;
      stopLoop();
      sourceImage.onload = null;
      sourceImage.onerror = null;
      sourceImage.src = '';
    });
  });

  createEffect(() => {
    props.state;
    props.active;
    props.reducedMotion;
    if (!host) return;
    sampleNow(performance.now());
    ensureLoop();
  });

  const headLayerActive = () =>
    Math.abs(motion().neckAngleDeg) > 0.0001 ||
    Math.abs(motion().gazeOffsetPx) > 0.0001 ||
    motion().blinkClosure > 0.0001;
  const torsoLayerActive = () =>
    Math.abs(motion().torsoAngleDeg) > 0.0001 ||
    motion().breathAmount > 0.0001 ||
    motion().acknowledgementActive;
  const headTransform = () => `rotate(${motion().neckAngleDeg.toFixed(4)} 112 108)`;
  const torsoTransform = () => `rotate(${motion().torsoAngleDeg.toFixed(4)} 112 245)`;
  const chestTransform = () =>
    `translate(112 240) scale(${motion().chestScaleX.toFixed(5)} ${motion().chestScaleY.toFixed(5)}) translate(-112 -240)`;
  const shoulderBreathTransform = () => `translate(0 ${(-motion().shoulderRisePx).toFixed(4)})`;
  const coreBreathTransform = () => `translate(0 ${(-motion().chestRisePx).toFixed(4)})`;
  const shoulderTransform = () => `rotate(${motion().shoulderAngleDeg.toFixed(4)} 60 125)`;
  const elbowTransform = () => `rotate(${motion().elbowAngleDeg.toFixed(4)} 49 198)`;
  const wristTransform = () => `rotate(${motion().wristAdditionalDeg.toFixed(4)} 31 267)`;
  const gazeTransform = () => `translate(${motion().gazeOffsetPx.toFixed(4)} 0)`;
  const blinkSkinTransform = () => `translate(0 ${(motion().blinkClosure * 4.2).toFixed(4)})`;
  const blinkCoverHeight = () => Math.max(0, motion().blinkClosure * 9.5).toFixed(4);
  const blinkLashOpacity = () => Math.max(0, Math.min(1, (motion().blinkClosure - 0.82) / 0.18)).toFixed(4);
  const torsoArmMask = () => motion().acknowledgementActive ? 'url(#nyx-s7-torso-no-arm)' : undefined;

  return (
    <div
      ref={host}
      class="nyx-2d-webgl nyx-stage7-experimental"
      data-nyx-2d-stage="stage7-experimental-source-pixel-runtime"
      aria-hidden="true">
      <svg
        class="nyx-stage7-experimental__svg"
        viewBox={`0 0 ${NYX_STAGE7_CANVAS_WIDTH} ${NYX_STAGE7_SOURCE_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="presentation">
        <defs>
          <clipPath id="nyx-s7-sil" clipPathUnits="userSpaceOnUse">
            <path d={NYX_STAGE7_SILHOUETTE_BASE_D} />
            <path d={NYX_STAGE7_SILHOUETTE_RIGHT_ARM_D} />
          </clipPath>
          <clipPath id="nyx-s7-head" clipPathUnits="userSpaceOnUse"><path d={NYX_STAGE7_HEAD_REGION_D} /></clipPath>
          <clipPath id="nyx-s7-torso" clipPathUnits="userSpaceOnUse"><path d={NYX_STAGE7_TORSO_REGION_D} /></clipPath>
          <clipPath id="nyx-s7-chest" clipPathUnits="userSpaceOnUse"><path d={NYX_STAGE7_CHEST_REGION_D} /></clipPath>
          <clipPath id="nyx-s7-shoulders" clipPathUnits="userSpaceOnUse"><path d={NYX_STAGE7_SHOULDER_REGION_D} /></clipPath>
          <clipPath id="nyx-s7-core" clipPathUnits="userSpaceOnUse"><path d={NYX_STAGE7_CORE_REGION_D} /></clipPath>
          <clipPath id="nyx-s7-arm" clipPathUnits="userSpaceOnUse"><path d={NYX_STAGE7_ARM_REGION_D} /></clipPath>
          <clipPath id="nyx-s7-fore" clipPathUnits="userSpaceOnUse"><path d={NYX_STAGE7_FOREARM_REGION_D} /></clipPath>
          <clipPath id="nyx-s7-hand" clipPathUnits="userSpaceOnUse"><path d={NYX_STAGE7_HAND_REGION_D} /></clipPath>
          <clipPath id="nyx-s7-eyes" clipPathUnits="userSpaceOnUse"><path d={NYX_STAGE7_EYE_APERTURES_D} /></clipPath>
          <clipPath id="nyx-s7-blink-progress" clipPathUnits="userSpaceOnUse">
            <rect x="92" y="52" width="47" height={blinkCoverHeight()} />
          </clipPath>

          <mask id="nyx-s7-base-dynamic" maskUnits="userSpaceOnUse" x="0" y="0" width="202" height="648">
            <rect width="202" height="648" fill="white" />
            {headLayerActive() && <path d={NYX_STAGE7_HEAD_REGION_D} fill="black" />}
            {torsoLayerActive() && <path d={NYX_STAGE7_TORSO_REGION_D} fill="black" />}
            {motion().acknowledgementActive && <path d={NYX_STAGE7_ARM_BASE_REMOVAL_D} fill="black" />}
          </mask>
          <mask id="nyx-s7-torso-still" maskUnits="userSpaceOnUse" x="0" y="0" width="202" height="648">
            <rect width="202" height="648" fill="white" />
            <path d={NYX_STAGE7_CHEST_REGION_D} fill="black" />
            <path d={NYX_STAGE7_SHOULDER_REGION_D} fill="black" />
            <path d={NYX_STAGE7_CORE_REGION_D} fill="black" />
          </mask>
          <mask id="nyx-s7-chest-no-core" maskUnits="userSpaceOnUse" x="0" y="0" width="202" height="648">
            <rect width="202" height="648" fill="white" />
            <path d={NYX_STAGE7_CORE_REGION_D} fill="black" />
          </mask>
          <mask id="nyx-s7-head-no-eyes" maskUnits="userSpaceOnUse" x="0" y="0" width="202" height="648">
            <rect width="202" height="648" fill="white" />
            <path d={NYX_STAGE7_EYE_APERTURES_D} fill="black" />
          </mask>
          <mask id="nyx-s7-upper-only" maskUnits="userSpaceOnUse" x="0" y="0" width="202" height="648">
            <rect width="202" height="648" fill="white" />
            <path d={NYX_STAGE7_FOREARM_REGION_D} fill="black" />
          </mask>
          <mask id="nyx-s7-fore-only" maskUnits="userSpaceOnUse" x="0" y="0" width="202" height="648">
            <rect width="202" height="648" fill="white" />
            <path d={NYX_STAGE7_HAND_REGION_D} fill="black" />
          </mask>
          <mask id="nyx-s7-torso-no-arm" maskUnits="userSpaceOnUse" x="0" y="0" width="202" height="648">
            <rect width="202" height="648" fill="white" />
            <path d={NYX_STAGE7_ARM_BASE_REMOVAL_D} fill="black" />
          </mask>
        </defs>

        <g transform={`translate(${NYX_STAGE7_SOURCE_OFFSET_X} 0)`}>
          <g clip-path="url(#nyx-s7-sil)" mask="url(#nyx-s7-base-dynamic)">
            <image href={nyxStage7FrontPath} width="202" height="648" />
          </g>

          {torsoLayerActive() && (
            <g transform={torsoTransform()} mask={torsoArmMask()}>
              <g clip-path="url(#nyx-s7-torso)">
                <g clip-path="url(#nyx-s7-sil)" mask="url(#nyx-s7-torso-still)">
                  <image href={nyxStage7FrontPath} width="202" height="648" />
                </g>
              </g>
              <g transform={shoulderBreathTransform()} clip-path="url(#nyx-s7-shoulders)">
                <g clip-path="url(#nyx-s7-sil)">
                  <image href={nyxStage7FrontPath} width="202" height="648" />
                </g>
              </g>
              <g transform={chestTransform()} clip-path="url(#nyx-s7-chest)">
                <g clip-path="url(#nyx-s7-sil)" mask="url(#nyx-s7-chest-no-core)">
                  <image href={nyxStage7FrontPath} width="202" height="648" />
                </g>
              </g>
              <g transform={coreBreathTransform()} clip-path="url(#nyx-s7-core)">
                <g clip-path="url(#nyx-s7-sil)">
                  <image href={nyxStage7FrontPath} width="202" height="648" />
                </g>
              </g>
            </g>
          )}

          {headLayerActive() && (
            <g transform={headTransform()}>
              <g clip-path="url(#nyx-s7-head)">
                <g clip-path="url(#nyx-s7-sil)">
                  <g mask="url(#nyx-s7-head-no-eyes)">
                    <image href={nyxStage7FrontPath} width="202" height="648" />
                  </g>
                  <g clip-path="url(#nyx-s7-eyes)">
                    <g transform={gazeTransform()}>
                      <image href={nyxStage7FrontPath} width="202" height="648" />
                    </g>
                  </g>
                  <g clip-path="url(#nyx-s7-eyes)">
                    <g clip-path="url(#nyx-s7-blink-progress)">
                      <g transform={blinkSkinTransform()}>
                        <image href={nyxStage7FrontPath} width="202" height="648" />
                      </g>
                    </g>
                  </g>
                  <g opacity={blinkLashOpacity()}>
                    <path
                      d="M 97.2 57.5 Q 105 58.3 112.7 57.5"
                      fill="none"
                      stroke="rgb(27 16 23)"
                      stroke-width="0.45"
                      stroke-linecap="round"
                    />
                    <path
                      d="M 119.4 57.5 Q 127 58.3 134.7 57.5"
                      fill="none"
                      stroke="rgb(27 16 23)"
                      stroke-width="0.45"
                      stroke-linecap="round"
                    />
                  </g>
                </g>
              </g>
            </g>
          )}

          {motion().acknowledgementActive && (
            <g transform={shoulderTransform()}>
              <g clip-path="url(#nyx-s7-arm)">
                <g clip-path="url(#nyx-s7-sil)" mask="url(#nyx-s7-upper-only)">
                  <image href={nyxStage7FrontPath} width="202" height="648" />
                </g>
              </g>
              <g transform={elbowTransform()}>
                <g clip-path="url(#nyx-s7-fore)">
                  <g clip-path="url(#nyx-s7-sil)" mask="url(#nyx-s7-fore-only)">
                    <image href={nyxStage7FrontPath} width="202" height="648" />
                  </g>
                </g>
                <g transform={wristTransform()} clip-path="url(#nyx-s7-hand)">
                  <g clip-path="url(#nyx-s7-sil)">
                    <image href={nyxStage7FrontPath} width="202" height="648" />
                  </g>
                </g>
              </g>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
