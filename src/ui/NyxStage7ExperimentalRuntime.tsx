import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { nyx2DRuntimeAttentionTarget } from './nyx2dAttention';
import {
  createNyxStage7MotionState,
  neutralNyxStage7MotionSample,
  NYX_STAGE7_MAX_LAYER_EQUIVALENT,
  NYX_STAGE7_TARGET_FPS,
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
export const nyxStage7SilhouettePath = new URL(
  '../../assets/operator/nyx-redesign/experimental/stage-02/base-v03/views/front.svg',
  import.meta.url,
).href;

const SOURCE_WIDTH = 202;
const SOURCE_HEIGHT = 648;
const FRAME_INTERVAL_MS = 1000 / NYX_STAGE7_TARGET_FPS;

export default function NyxStage7ExperimentalRuntime(props: NyxStage7ExperimentalRuntimeProps) {
  let host!: HTMLDivElement;
  const [motion, setMotion] = createSignal<NyxStage7MotionSample>(neutralNyxStage7MotionSample());
  const runtime = createNyxStage7MotionState(
    typeof performance === 'undefined' ? 0 : performance.now(),
    props.state,
  );
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
  };

  const sampleNow = (now: number) => {
    const attentionTarget = nyx2DRuntimeAttentionTarget();
    const started = performance.now();
    const next = stepNyxStage7Motion(runtime, {
      state: props.state,
      attentionTarget,
      animate: shouldAnimate(),
      forceNeutral: shouldForceNeutral(),
    }, now);
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
      if (sourceImage.naturalWidth !== SOURCE_WIDTH || sourceImage.naturalHeight !== SOURCE_HEIGHT) {
        props.onUnavailable(
          `NYX Stage 7 REF-FRONT decoded as ${sourceImage.naturalWidth}x${sourceImage.naturalHeight}; expected ${SOURCE_WIDTH}x${SOURCE_HEIGHT}`,
        );
      }
    };
    sourceImage.onerror = () => props.onUnavailable(`NYX Stage 7 REF-FRONT unavailable: ${nyxStage7FrontPath}`);
    sourceImage.src = nyxStage7FrontPath;

    const silhouetteImage = new Image();
    silhouetteImage.decoding = 'async';
    silhouetteImage.onload = () => {
      if (silhouetteImage.naturalWidth !== SOURCE_WIDTH || silhouetteImage.naturalHeight !== SOURCE_HEIGHT) {
        props.onUnavailable(
          `NYX Stage 7 silhouette decoded as ${silhouetteImage.naturalWidth}x${silhouetteImage.naturalHeight}; expected ${SOURCE_WIDTH}x${SOURCE_HEIGHT}`,
        );
      }
    };
    silhouetteImage.onerror = () => props.onUnavailable(`NYX Stage 7 silhouette unavailable: ${nyxStage7SilhouettePath}`);
    silhouetteImage.src = nyxStage7SilhouettePath;

    sampleNow(performance.now());
    ensureLoop();

    onCleanup(() => {
      disposed = true;
      stopLoop();
      sourceImage.onload = null;
      sourceImage.onerror = null;
      sourceImage.src = '';
      silhouetteImage.onload = null;
      silhouetteImage.onerror = null;
      silhouetteImage.src = '';
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

  const baseMask = () => motion().acknowledgementActive
    ? 'url(#nyx-s7-base-no-head-torso-arm)'
    : 'url(#nyx-s7-base-no-head-torso)';
  const headTransform = () => `rotate(${motion().neckAngleDeg.toFixed(4)} 112 108)`;
  const torsoTransform = () => `rotate(${motion().torsoAngleDeg.toFixed(4)} 112 245)`;
  const shoulderTransform = () => `rotate(${motion().shoulderAngleDeg.toFixed(4)} 60 125)`;
  const elbowTransform = () => `rotate(${motion().elbowAngleDeg.toFixed(4)} 49 198)`;
  const wristTransform = () => `rotate(${motion().wristAdditionalDeg.toFixed(4)} 31 267)`;
  const gazeTransform = () => `translate(${motion().gazeOffsetPx.toFixed(4)} 0)`;
  const blinkOpacity = () => motion().blinkClosure.toFixed(4);
  const blinkLashOpacity = () => (motion().blinkClosure * 0.5).toFixed(4);

  return (
    <div
      ref={host}
      class="nyx-2d-webgl nyx-stage7-experimental"
      data-nyx-2d-stage="stage7-experimental-source-pixel-runtime"
      aria-hidden="true">
      <svg
        class="nyx-stage7-experimental__svg"
        viewBox="0 0 302 648"
        preserveAspectRatio="xMidYMid meet"
        role="presentation">
        <defs>
          <mask id="nyx-s7-sil" maskUnits="userSpaceOnUse" x="0" y="0" width="202" height="648" style="mask-type: alpha">
            <image href={nyxStage7SilhouettePath} width="202" height="648" />
          </mask>
          <clipPath id="nyx-s7-head"><rect x="62" y="0" width="102" height="125" /></clipPath>
          <clipPath id="nyx-s7-torso"><polygon points="76,108 150,108 166,270 60,270" /></clipPath>
          <clipPath id="nyx-s7-arm"><polygon points="55,108 72,112 75,130 72,150 70,170 67,190 64,205 61,220 58,235 54,250 49,264 43,272 40,282 40,300 37,313 30,316 24,310 22,300 22,286 25,274 30,264 33,250 37,235 41,220 45,205 49,190 51,170 52,150 53,130" /></clipPath>
          <clipPath id="nyx-s7-fore"><polygon points="47,185 66,190 65,205 62,220 58,236 54,251 49,265 43,272 40,282 40,301 37,313 30,316 24,310 22,300 22,286 25,274 30,264 33,250 37,235 41,220 44,205" /></clipPath>
          <clipPath id="nyx-s7-hand"><polygon points="22,260 40,260 44,270 43,285 41,300 38,312 33,318 27,316 22,309 20,297 20,282" /></clipPath>
          <clipPath id="nyx-s7-le"><rect x="97" y="54" width="16" height="14" rx="4" /></clipPath>
          <clipPath id="nyx-s7-re"><rect x="119" y="54" width="16" height="14" rx="4" /></clipPath>
          <clipPath id="nyx-s7-le-blink"><ellipse cx="105" cy="57" rx="9" ry="4.5" /></clipPath>
          <clipPath id="nyx-s7-re-blink"><ellipse cx="127" cy="57" rx="9" ry="4.5" /></clipPath>
          <mask id="nyx-s7-base-no-head-torso" maskUnits="userSpaceOnUse" x="0" y="0" width="202" height="648">
            <rect width="202" height="648" fill="white" />
            <rect x="64" y="0" width="98" height="118" fill="black" />
            <polygon points="78,112 148,112 164,265 62,265" fill="black" />
          </mask>
          <mask id="nyx-s7-base-no-head-torso-arm" maskUnits="userSpaceOnUse" x="0" y="0" width="202" height="648">
            <rect width="202" height="648" fill="white" />
            <rect x="64" y="0" width="98" height="118" fill="black" />
            <polygon points="78,112 148,112 164,265 62,265" fill="black" />
            <polygon points="55,108 72,112 75,130 72,150 70,170 67,190 64,205 61,220 58,235 54,250 49,264 43,272 40,282 40,300 37,313 30,316 24,310 22,300 22,286 25,274 30,264 33,250 37,235 41,220 45,205 49,190 51,170 52,150 53,130" fill="black" />
            <rect x="20" y="165" width="27" height="122" fill="black" />
          </mask>
          <mask id="nyx-s7-upper-only" maskUnits="userSpaceOnUse" x="0" y="0" width="202" height="648">
            <rect width="202" height="648" fill="white" />
            <polygon points="47,185 66,190 65,205 62,220 58,236 54,251 49,265 43,272 40,282 40,301 37,313 30,316 24,310 22,300 22,286 25,274 30,264 33,250 37,235 41,220 44,205" fill="black" />
          </mask>
          <mask id="nyx-s7-fore-only" maskUnits="userSpaceOnUse" x="0" y="0" width="202" height="648">
            <rect width="202" height="648" fill="white" />
            <polygon points="22,260 40,260 44,270 43,285 41,300 38,312 33,318 27,316 22,309 20,297 20,282" fill="black" />
          </mask>
        </defs>
        <g transform="translate(50 0)">
          <g mask="url(#nyx-s7-sil)">
            <g mask={baseMask()}>
              <image href={nyxStage7FrontPath} width="202" height="648" />
            </g>
          </g>
          <g transform={torsoTransform()}>
            <g clip-path="url(#nyx-s7-torso)" mask="url(#nyx-s7-sil)">
              <image href={nyxStage7FrontPath} width="202" height="648" />
            </g>
          </g>
          <g transform={headTransform()}>
            <g clip-path="url(#nyx-s7-head)" mask="url(#nyx-s7-sil)">
              <image href={nyxStage7FrontPath} width="202" height="648" />
              <g clip-path="url(#nyx-s7-le)">
                <g transform={gazeTransform()}>
                  <image href={nyxStage7FrontPath} width="202" height="648" />
                </g>
              </g>
              <g clip-path="url(#nyx-s7-re)">
                <g transform={gazeTransform()}>
                  <image href={nyxStage7FrontPath} width="202" height="648" />
                </g>
              </g>
              <g clip-path="url(#nyx-s7-le-blink)" opacity={blinkOpacity()}>
                <image href={nyxStage7FrontPath} width="202" height="648" transform="translate(0 -6)" />
              </g>
              <g clip-path="url(#nyx-s7-re-blink)" opacity={blinkOpacity()}>
                <image href={nyxStage7FrontPath} width="202" height="648" transform="translate(0 -6)" />
              </g>
              <path
                d="M 97.5 57.4 Q 105 58.6 112.5 57.4"
                fill="none"
                stroke="rgb(22 12 20)"
                stroke-width="0.55"
                stroke-linecap="round"
                opacity={blinkLashOpacity()}
              />
              <path
                d="M 119.5 57.4 Q 127 58.6 134.5 57.4"
                fill="none"
                stroke="rgb(22 12 20)"
                stroke-width="0.55"
                stroke-linecap="round"
                opacity={blinkLashOpacity()}
              />
            </g>
          </g>
          {motion().acknowledgementActive && (
            <g transform={shoulderTransform()}>
              <g clip-path="url(#nyx-s7-arm)" mask="url(#nyx-s7-upper-only)">
                <image href={nyxStage7FrontPath} width="202" height="648" />
              </g>
              <g transform={elbowTransform()}>
                <g clip-path="url(#nyx-s7-fore)" mask="url(#nyx-s7-fore-only)">
                  <image href={nyxStage7FrontPath} width="202" height="648" />
                </g>
                <g transform={wristTransform()} clip-path="url(#nyx-s7-hand)">
                  <image href={nyxStage7FrontPath} width="202" height="648" />
                </g>
              </g>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
