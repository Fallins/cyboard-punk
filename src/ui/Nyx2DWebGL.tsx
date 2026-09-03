import { createEffect, onCleanup, onMount } from 'solid-js';
import * as THREE from 'three';
import {
  interpolateNyx2DArticulation,
  nyx2DArticulationTarget,
  nyx2DArticulationTransitionMs,
  type Nyx2DArticulationPose,
} from './nyx2dArticulation';
import {
  applyNyx2DArticulationLayer,
  createNyx2DArticulatedBodyTexture,
  createNyx2DArticulationLayer,
  disposeNyx2DArticulationLayer,
  type Nyx2DArticulationLayer,
} from './nyx2dArticulationLayer';
import type { Nyx2DAttentionTarget } from './nyx2dAttention';
import { nyx2DBlinkAmountAtTime, nyx2DBlinkEnabled, nyx2DShouldAnimateBlink } from './nyx2dBlink';
import { createNyx2DBlinkMaterial } from './nyx2dBlinkMaterial';
import { nyx2DBreathEnabled, nyx2DBreathPoseAtTime, nyx2DShouldAnimateBreath } from './nyx2dBreath';
import { createNyx2DRigDebugMaterial, nyx2DRigDebugEnabled } from './nyx2dDebug';
import {
  nyx2DGazeEnabled,
  nyx2DGazeOffsetAtTime,
  nyx2DShouldAnimateGaze,
} from './nyx2dGaze';
import { createNyx2DGazeMaterial } from './nyx2dGazeMaterial';
import {
  applyNyx2DBreathPose,
  createNyx2DBodyGeometryRig,
  resetNyx2DBodyGeometry,
} from './nyx2dGeometry';
import {
  createNyx2DHairSpringState,
  nyx2DHairAmbientTarget,
  nyx2DHairMotionEnabled,
  nyx2DHairTargetFromHead,
  nyx2DShouldAnimateHair,
  resetNyx2DHairSpring,
  stepNyx2DHairSpring,
} from './nyx2dHair';
import {
  createNyx2DHairOverlayMask,
  createNyx2DHairOverlayMaterial,
  NYX_2D_HAIR_PIVOT,
} from './nyx2dHairLayer';
import {
  createNyx2DHairMaskDebugMaterial,
  nyx2DHairMaskDebugEnabled,
} from './nyx2dHairMaskDebug';
import {
  nyx2DHeadMotionEnabled,
  nyx2DHeadPoseAtTime,
  nyx2DShouldAnimateHead,
} from './nyx2dMotion';
import { nyx2DPosterPath } from './Nyx2DPrototype';
import { NYX_2D_PARTITION } from './nyx2dRig';
import { nyx2DEmissiveAtTime, nyx2DFrameIntervalMs } from './nyx2dRuntime';
import { nyx2DEmissiveIntensity, nyx2DShouldAnimateEffects } from './nyx2dState';
import type { OperatorRuntimeState } from './operatorRuntime';

interface Nyx2DWebGLProps {
  state: OperatorRuntimeState;
  active: boolean;
  reducedMotion: boolean;
  onUnavailable: (reason: string) => void;
}

const MASTER_WIDTH = 941;
const MASTER_HEIGHT = 1672;
const MASTER_ASPECT = MASTER_WIDTH / MASTER_HEIGHT;
const MASTER_SOURCE_BYTES = 588284;
const PIXEL_RATIO_CAP = 2;
const RIG_DEBUG = nyx2DRigDebugEnabled(import.meta.env.VITE_NYX_2D_RIG_DEBUG);
const HAIR_MASK_DEBUG = nyx2DHairMaskDebugEnabled(import.meta.env.VITE_NYX_2D_HAIR_MASK_DEBUG);
const HEAD_MOTION = nyx2DHeadMotionEnabled(import.meta.env.VITE_NYX_2D_HEAD_MOTION);
const BODY_MOTION = nyx2DBreathEnabled(import.meta.env.VITE_NYX_2D_BREATH);
const BLINK = nyx2DBlinkEnabled(import.meta.env.VITE_NYX_2D_BLINK);
const GAZE = nyx2DGazeEnabled(import.meta.env.VITE_NYX_2D_GAZE);
const HAIR_MOTION = nyx2DHairMotionEnabled(import.meta.env.VITE_NYX_2D_HAIR_MOTION);
const MOTION_FPS = GAZE || HAIR_MOTION ? 30 : 24;

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return String(error || 'unknown NYX 2D renderer error');
}

function readAttentionTarget(host: HTMLElement): Nyx2DAttentionTarget {
  const value = host.closest('.operator-stage')?.getAttribute('data-attention-target');
  return value === 'codex' || value === 'claude' || value === 'cursor' ? value : 'center';
}

function loadMasterImage(signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';

    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener('abort', handleAbort);
    };

    const handleAbort = () => {
      cleanup();
      image.src = '';
      reject(new DOMException('NYX 2D master load aborted', 'AbortError'));
    };

    image.onload = () => {
      cleanup();
      if (image.naturalWidth !== MASTER_WIDTH || image.naturalHeight !== MASTER_HEIGHT) {
        reject(
          new Error(
            `NYX 2D master decoded as ${image.naturalWidth}x${image.naturalHeight}; expected ${MASTER_WIDTH}x${MASTER_HEIGHT} (${nyx2DPosterPath})`,
          ),
        );
        return;
      }
      resolve(image);
    };

    image.onerror = () => {
      cleanup();
      reject(new Error(`NYX 2D browser image decode failed (${nyx2DPosterPath})`));
    };

    signal.addEventListener('abort', handleAbort, { once: true });
    image.src = nyx2DPosterPath;
  });
}

async function loadMasterAsset(signal: AbortSignal) {
  const image = await loadMasterImage(signal);
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return { image, texture };
}

function createPartitionAlphaMap(keepHead: boolean): THREE.DataTexture {
  const data = new Uint8Array(MASTER_HEIGHT * 4);
  const cutUv = NYX_2D_PARTITION.headCutUvY;

  for (let row = 0; row < MASTER_HEIGHT; row += 1) {
    const v = (row + 0.5) / MASTER_HEIGHT;
    const isHead = v >= cutUv;
    const keep = isHead === keepHead ? 255 : 0;
    const offset = row * 4;
    data[offset] = keep;
    data[offset + 1] = keep;
    data[offset + 2] = keep;
    data[offset + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, 1, MASTER_HEIGHT, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createBaseLayerMaterial(alphaMap: THREE.Texture) {
  return new THREE.MeshBasicMaterial({
    transparent: true,
    alphaMap,
    alphaTest: 0.001,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

function createHiddenSeamTexture(image: HTMLImageElement): THREE.CanvasTexture | null {
  if (!HEAD_MOTION) return null;

  const canvas = document.createElement('canvas');
  canvas.width = MASTER_WIDTH;
  canvas.height = MASTER_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const cut = NYX_2D_PARTITION.headCutYPx;
  const band = NYX_2D_PARTITION.hiddenSeamBandPx;
  const x = NYX_2D_PARTITION.hiddenSeamXMinPx;
  const width = NYX_2D_PARTITION.hiddenSeamXMaxPx - x;

  context.save();
  context.translate(0, cut * 2);
  context.scale(1, -1);
  context.drawImage(image, x, cut, width, band, x, cut, width, band);
  context.restore();

  context.globalCompositeOperation = 'destination-in';
  context.drawImage(image, x, cut - band, width, band, x, cut - band, width, band);
  context.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createEmissiveMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: null as THREE.Texture | null },
      uIntensity: { value: 0.16 },
      uHeadCut: { value: NYX_2D_PARTITION.headCutUvY },
      uSuppressHead: { value: HEAD_MOTION ? 1 : 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uIntensity;
      uniform float uHeadCut;
      uniform float uSuppressHead;
      varying vec2 vUv;

      void main() {
        if (uSuppressHead > 0.5 && vUv.y >= uHeadCut) discard;

        vec4 source = texture2D(uMap, vUv);
        float maxChannel = max(source.r, max(source.g, source.b));
        float minChannel = min(source.r, min(source.g, source.b));
        float chroma = maxChannel - minChannel;

        float cyan = smoothstep(0.13, 0.34, min(source.g, source.b) - source.r * 0.55);
        float magenta = smoothstep(0.12, 0.33, min(source.r, source.b) - source.g * 0.58);
        float violet = smoothstep(0.08, 0.28, source.b - source.g * 0.55);
        float bright = smoothstep(0.38, 0.88, maxChannel);
        float saturated = smoothstep(0.10, 0.42, chroma);
        float suitNeon = max(cyan, max(magenta, violet)) * bright * saturated;

        vec2 coreDelta = (vUv - vec2(0.447, 0.792)) / vec2(0.065, 0.052);
        float coreRegion = 1.0 - smoothstep(0.25, 1.0, length(coreDelta));
        float core = coreRegion * max(magenta, violet) * bright;

        float mask = clamp(max(suitNeon * 0.72, core), 0.0, 1.0);
        float alpha = source.a * mask * uIntensity;
        gl_FragColor = vec4(source.rgb * (0.8 + mask * 0.65), alpha);
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  });
}

export default function Nyx2DWebGL(props: Nyx2DWebGLProps) {
  let host!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  let syncRuntime: (() => void) | undefined;

  createEffect(() => {
    props.state;
    props.active;
    props.reducedMotion;
    syncRuntime?.();
  });

  onMount(() => {
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
        premultipliedAlpha: false,
      });
    } catch (error) {
      props.onUnavailable(`NYX 2D WebGL initialization failed: ${errorMessage(error)}`);
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 1);
    camera.position.z = 0.5;

    const staticGeometry = new THREE.PlaneGeometry(MASTER_ASPECT, 1);
    const bodyRig = createNyx2DBodyGeometryRig();
    const bodyAlphaMap = createPartitionAlphaMap(false);
    const headAlphaMap = createPartitionAlphaMap(true);
    const bodyMaterial = createBaseLayerMaterial(bodyAlphaMap);
    const headMaterial = createBaseLayerMaterial(headAlphaMap);

    const bodyPlane = new THREE.Mesh(bodyRig.geometry, bodyMaterial);
    bodyPlane.renderOrder = 1;
    scene.add(bodyPlane);

    let hiddenSeamTexture: THREE.CanvasTexture | null = null;
    let hiddenSeamMaterial: THREE.MeshBasicMaterial | null = null;
    let hiddenSeamPlane: THREE.Mesh | null = null;
    let headMotionReady = false;

    const headPivotX = NYX_2D_PARTITION.headPivotWorldX;
    const headPivotY = NYX_2D_PARTITION.headPivotWorldY;
    const headGroup = new THREE.Group();
    headGroup.position.set(headPivotX, headPivotY, 0);

    const headPlane = new THREE.Mesh(staticGeometry, headMaterial);
    headPlane.position.set(-headPivotX, -headPivotY, 0.007);
    headPlane.renderOrder = 3;
    headGroup.add(headPlane);

    const gazeMaterial = GAZE ? createNyx2DGazeMaterial() : null;
    const gazePlane = gazeMaterial ? new THREE.Mesh(staticGeometry, gazeMaterial) : null;
    if (gazePlane) {
      gazePlane.position.set(-headPivotX, -headPivotY, 0.008);
      gazePlane.renderOrder = 6;
      gazePlane.visible = false;
      headGroup.add(gazePlane);
    }

    const blinkMaterial = BLINK ? createNyx2DBlinkMaterial() : null;
    const blinkPlane = blinkMaterial ? new THREE.Mesh(staticGeometry, blinkMaterial) : null;
    if (blinkPlane) {
      blinkPlane.position.set(-headPivotX, -headPivotY, 0.009);
      blinkPlane.renderOrder = 7;
      blinkPlane.visible = false;
      headGroup.add(blinkPlane);
    }

    let hairAlphaMap: THREE.DataTexture | null = null;
    let hairMaterial: THREE.MeshBasicMaterial | null = null;
    let hairPlane: THREE.Mesh | null = null;
    let hairMotionReady = false;
    let hairMaskedPixels = 0;
    const hairGroup = new THREE.Group();
    hairGroup.position.set(
      NYX_2D_HAIR_PIVOT.x - headPivotX,
      NYX_2D_HAIR_PIVOT.y - headPivotY,
      0,
    );
    headGroup.add(hairGroup);

    const hairMaskDebugMaterial = HAIR_MASK_DEBUG ? createNyx2DHairMaskDebugMaterial() : null;
    const hairMaskDebugPlane = hairMaskDebugMaterial
      ? new THREE.Mesh(staticGeometry, hairMaskDebugMaterial)
      : null;
    if (hairMaskDebugPlane) {
      hairMaskDebugPlane.position.set(-headPivotX, -headPivotY, 0.012);
      hairMaskDebugPlane.renderOrder = 11;
      headGroup.add(hairMaskDebugPlane);
    }
    scene.add(headGroup);

    const emissiveMaterial = createEmissiveMaterial();
    const emissivePlane = new THREE.Mesh(bodyRig.geometry, emissiveMaterial);
    emissivePlane.position.z = 0.01;
    emissivePlane.renderOrder = 9;
    scene.add(emissivePlane);

    const debugMaterial = RIG_DEBUG ? createNyx2DRigDebugMaterial() : null;
    const debugPlane = debugMaterial ? new THREE.Mesh(staticGeometry, debugMaterial) : null;
    if (debugPlane) {
      debugPlane.position.z = 0.02;
      debugPlane.renderOrder = 10;
      scene.add(debugPlane);
    }

    let texture: THREE.Texture | null = null;
    let articulatedBodyTexture: THREE.CanvasTexture | null = null;
    let articulationLayer: Nyx2DArticulationLayer | null = null;
    let articulationReady = false;
    let articulationState: OperatorRuntimeState = props.state;
    let articulationStartedAt = 0;
    let articulationFrom: Nyx2DArticulationPose = nyx2DArticulationTarget(props.state);
    let articulationTo: Nyx2DArticulationPose = nyx2DArticulationTarget(props.state);
    let currentArticulation: Nyx2DArticulationPose = nyx2DArticulationTarget(props.state);
    let disposed = false;
    let ready = false;
    let intersecting = true;
    let rafId = 0;
    let animationEpoch = 0;
    let lastAnimatedFrame = 0;
    let lastGazeElapsedMs = 0;
    let lastHairElapsedMs = 0;
    const currentGaze = new THREE.Vector2();
    const hairSpring = createNyx2DHairSpringState();
    const controller = new AbortController();
    const frameInterval = nyx2DFrameIntervalMs(MOTION_FPS);

    const isVisible = () => props.active && intersecting && !document.hidden;
    const canAnimateHead = () =>
      nyx2DShouldAnimateHead(props.state, true, props.reducedMotion, HEAD_MOTION && headMotionReady);
    const canAnimateBody = () =>
      nyx2DShouldAnimateBreath(props.state, true, props.reducedMotion, BODY_MOTION);
    const canAnimateBlink = () =>
      nyx2DShouldAnimateBlink(props.state, true, props.reducedMotion, BLINK && !!blinkMaterial);
    const canAnimateGaze = () =>
      nyx2DShouldAnimateGaze(props.state, true, props.reducedMotion, GAZE && !!gazeMaterial);
    const canAnimateHair = () =>
      nyx2DShouldAnimateHair(props.state, true, props.reducedMotion, HAIR_MOTION && hairMotionReady);
    const canAnimateEffects = () => nyx2DShouldAnimateEffects(props.state, true, props.reducedMotion);
    const shouldAnimateRuntime = () =>
      isVisible() && (
        canAnimateHead() ||
        canAnimateBody() ||
        canAnimateBlink() ||
        canAnimateGaze() ||
        canAnimateHair() ||
        canAnimateEffects() ||
        articulationReady
      );

    const resetHeadPose = () => {
      headGroup.position.set(headPivotX, headPivotY, 0);
      headGroup.rotation.z = 0;
    };

    const headPoseForTime = (elapsedMs: number) =>
      canAnimateHead() ? nyx2DHeadPoseAtTime(props.state, elapsedMs) : { x: 0, y: 0, rotationRad: 0 };

    const applyHeadPose = (elapsedMs: number, animated: boolean) => {
      if (!animated || !canAnimateHead()) {
        resetHeadPose();
        return;
      }
      const pose = headPoseForTime(elapsedMs);
      headGroup.position.set(headPivotX + pose.x, headPivotY + pose.y, 0);
      headGroup.rotation.z = pose.rotationRad;
    };

    const resolveArticulationPose = (elapsedMs: number, animated: boolean): Nyx2DArticulationPose => {
      const target = nyx2DArticulationTarget(props.state);
      if (!animated || props.reducedMotion) {
        articulationState = props.state;
        articulationFrom = target;
        articulationTo = target;
        articulationStartedAt = elapsedMs;
        currentArticulation = target;
        return target;
      }

      if (props.state !== articulationState) {
        articulationState = props.state;
        articulationFrom = currentArticulation;
        articulationTo = target;
        articulationStartedAt = elapsedMs;
      }

      const duration = nyx2DArticulationTransitionMs(articulationState, articulationFrom, articulationTo);
      const progress = duration <= 0 ? 1 : (elapsedMs - articulationStartedAt) / duration;
      currentArticulation = interpolateNyx2DArticulation(articulationFrom, articulationTo, progress);
      return currentArticulation;
    };

    const resetBodyPose = () => resetNyx2DBodyGeometry(bodyRig);

    const applyBodyPose = (
      elapsedMs: number,
      animated: boolean,
      articulation: Nyx2DArticulationPose,
    ) => {
      const breath = animated && canAnimateBody()
        ? nyx2DBreathPoseAtTime(props.state, elapsedMs)
        : { translateY: 0, scaleX: 1, scaleY: 1 };
      applyNyx2DBreathPose(bodyRig, breath, {
        yaw: articulation.torsoYaw,
        shiftX: articulation.torsoShiftX,
        leanDeg: articulation.torsoLeanDeg,
      });
    };

    const applyArticulation = (pose: Nyx2DArticulationPose) => {
      if (!articulationLayer) return;
      applyNyx2DArticulationLayer(articulationLayer, pose);
    };

    const resetArticulation = () => {
      articulationState = props.state;
      articulationFrom = nyx2DArticulationTarget(props.state);
      articulationTo = articulationFrom;
      currentArticulation = articulationFrom;
      articulationStartedAt = 0;
      if (articulationLayer) applyNyx2DArticulationLayer(articulationLayer, currentArticulation);
    };

    const resetGaze = () => {
      currentGaze.set(0, 0);
      lastGazeElapsedMs = 0;
      if (!gazeMaterial || !gazePlane) return;
      gazeMaterial.uniforms.uOffset.value.set(0, 0);
      gazePlane.visible = false;
    };

    const applyGaze = (elapsedMs: number, animated: boolean) => {
      if (!gazeMaterial || !gazePlane || !animated || !canAnimateGaze()) {
        resetGaze();
        return;
      }

      const target = readAttentionTarget(host);
      const desired = nyx2DGazeOffsetAtTime(props.state, target, elapsedMs);
      const dt = lastGazeElapsedMs > 0 ? Math.max(0, elapsedMs - lastGazeElapsedMs) / 1000 : 0;
      lastGazeElapsedMs = elapsedMs;
      const damping = dt > 0 ? 1 - Math.exp(-dt * 12) : 0;
      currentGaze.x += (desired.u - currentGaze.x) * damping;
      currentGaze.y += (desired.v - currentGaze.y) * damping;
      gazeMaterial.uniforms.uOffset.value.copy(currentGaze);
      gazePlane.visible = true;
    };

    const resetBlink = () => {
      if (!blinkMaterial || !blinkPlane) return;
      blinkMaterial.uniforms.uBlink.value = 0;
      blinkPlane.visible = false;
    };

    const applyBlink = (elapsedMs: number, animated: boolean) => {
      if (!blinkMaterial || !blinkPlane || !animated || !canAnimateBlink()) {
        resetBlink();
        return;
      }
      const amount = nyx2DBlinkAmountAtTime(props.state, elapsedMs);
      blinkMaterial.uniforms.uBlink.value = amount;
      blinkPlane.visible = amount > 0.002;
    };

    const resetHair = () => {
      resetNyx2DHairSpring(hairSpring);
      lastHairElapsedMs = 0;
      hairGroup.rotation.z = 0;
    };

    const applyHair = (elapsedMs: number, animated: boolean) => {
      if (!animated || !canAnimateHair()) {
        resetHair();
        return;
      }
      const dt = lastHairElapsedMs > 0 ? Math.max(0, elapsedMs - lastHairElapsedMs) / 1000 : 0;
      lastHairElapsedMs = elapsedMs;
      const headPose = headPoseForTime(elapsedMs);
      const target = nyx2DHairTargetFromHead(headPose) + nyx2DHairAmbientTarget(elapsedMs);
      stepNyx2DHairSpring(hairSpring, target, dt);
      hairGroup.rotation.z = hairSpring.angleRad;
    };

    const publishMetrics = (renderMs: number, animated: boolean) => {
      host.dataset.asset = ready ? 'head-body-articulated-arms-gaze-hair-emissive' : 'loading';
      host.dataset.renderMs = renderMs.toFixed(2);
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.triangles = String(renderer.info.render.triangles);
      host.dataset.geometries = String(renderer.info.memory.geometries);
      host.dataset.textures = String(renderer.info.memory.textures);
      host.dataset.masterSize = `${MASTER_WIDTH}x${MASTER_HEIGHT}`;
      host.dataset.assetBytes = String(MASTER_SOURCE_BYTES);
      host.dataset.assetContentType = 'image/webp';
      host.dataset.assetUrl = nyx2DPosterPath;
      host.dataset.state = props.state;
      host.dataset.attentionTarget = readAttentionTarget(host);
      host.dataset.effectIntensity = emissiveMaterial.uniforms.uIntensity.value.toFixed(3);
      host.dataset.effectAnimated = String(animated && canAnimateEffects());
      host.dataset.headMotionRequested = String(HEAD_MOTION);
      host.dataset.headMotionReady = String(headMotionReady);
      host.dataset.headMotionAnimated = String(animated && canAnimateHead());
      host.dataset.bodyMotionRequested = String(BODY_MOTION);
      host.dataset.bodyMotionAnimated = String(animated && canAnimateBody());
      host.dataset.articulationReady = String(articulationReady);
      host.dataset.articulationMix = currentArticulation.mix.toFixed(3);
      host.dataset.leftShoulderDeg = currentArticulation.left.shoulderDeg.toFixed(1);
      host.dataset.leftElbowDeg = currentArticulation.left.elbowDeg.toFixed(1);
      host.dataset.rightShoulderDeg = currentArticulation.right.shoulderDeg.toFixed(1);
      host.dataset.rightElbowDeg = currentArticulation.right.elbowDeg.toFixed(1);
      host.dataset.torsoYaw = currentArticulation.torsoYaw.toFixed(3);
      host.dataset.gazeRequested = String(GAZE);
      host.dataset.gazeAnimated = String(animated && canAnimateGaze());
      host.dataset.gazeU = currentGaze.x.toFixed(4);
      host.dataset.gazeV = currentGaze.y.toFixed(4);
      host.dataset.blinkRequested = String(BLINK);
      host.dataset.blinkAnimated = String(animated && canAnimateBlink());
      host.dataset.blinkAmount = blinkMaterial?.uniforms.uBlink.value.toFixed(3) ?? '0.000';
      host.dataset.hairMotionRequested = String(HAIR_MOTION);
      host.dataset.hairMotionReady = String(hairMotionReady);
      host.dataset.hairMotionAnimated = String(animated && canAnimateHair());
      host.dataset.hairAngleDeg = THREE.MathUtils.radToDeg(hairSpring.angleRad).toFixed(3);
      host.dataset.hairMaskedPixels = String(hairMaskedPixels);
      host.dataset.hairMaskDebug = String(HAIR_MASK_DEBUG);
      host.dataset.rigDebug = String(RIG_DEBUG);
      host.dataset.visible = String(isVisible());
      host.dataset.headCutY = String(NYX_2D_PARTITION.headCutYPx);
    };

    const syncViewport = () => {
      if (disposed) return;
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const hostAspect = width / height;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_CAP));
      renderer.setSize(width, height, false);

      if (hostAspect >= MASTER_ASPECT) {
        camera.left = -hostAspect / 2;
        camera.right = hostAspect / 2;
        camera.top = 0.5;
        camera.bottom = -0.5;
      } else {
        const viewHeight = MASTER_ASPECT / hostAspect;
        camera.left = -MASTER_ASPECT / 2;
        camera.right = MASTER_ASPECT / 2;
        camera.top = viewHeight / 2;
        camera.bottom = -viewHeight / 2;
      }
      camera.updateProjectionMatrix();
    };

    const renderNow = (elapsedMs: number, animated: boolean) => {
      if (disposed || !ready || !isVisible()) return;
      const articulation = resolveArticulationPose(elapsedMs, animated);
      emissiveMaterial.uniforms.uIntensity.value = animated && canAnimateEffects()
        ? nyx2DEmissiveAtTime(props.state, elapsedMs)
        : nyx2DEmissiveIntensity(props.state);
      applyBodyPose(elapsedMs, animated, articulation);
      applyArticulation(articulation);
      applyHeadPose(elapsedMs, animated);
      applyHair(elapsedMs, animated);
      applyGaze(elapsedMs, animated);
      applyBlink(elapsedMs, animated);
      const started = performance.now();
      renderer.render(scene, camera);
      publishMetrics(Math.max(0, performance.now() - started), animated);
    };

    const renderStatic = () => renderNow(0, false);

    const stopAnimation = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      animationEpoch = 0;
      lastAnimatedFrame = 0;
      resetHeadPose();
      resetBodyPose();
      resetArticulation();
      resetHair();
      resetGaze();
      resetBlink();
    };

    const startAnimation = () => {
      stopAnimation();
      if (!ready || !shouldAnimateRuntime()) {
        renderStatic();
        return;
      }

      animationEpoch = performance.now();
      const tick = (now: number) => {
        if (disposed || !ready || !shouldAnimateRuntime()) {
          rafId = 0;
          resetHeadPose();
          resetBodyPose();
          resetArticulation();
          resetHair();
          resetGaze();
          resetBlink();
          return;
        }

        rafId = requestAnimationFrame(tick);
        if (lastAnimatedFrame && now - lastAnimatedFrame < frameInterval) return;
        lastAnimatedFrame = now;
        renderNow(now - animationEpoch, true);
      };
      rafId = requestAnimationFrame(tick);
    };

    syncRuntime = () => {
      stopAnimation();
      if (!ready || !isVisible()) return;
      renderStatic();
      if (shouldAnimateRuntime()) startAnimation();
    };

    const resize = () => {
      syncViewport();
      if (ready && isVisible()) renderStatic();
    };

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(host);
    window.addEventListener('resize', resize);

    const intersectionObserver = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(
          (entries) => {
            intersecting = entries[0]?.isIntersecting ?? true;
            syncRuntime?.();
          },
          { threshold: 0.01 },
        );
    intersectionObserver?.observe(host);

    const handleVisibility = () => {
      if (!document.hidden) syncViewport();
      syncRuntime?.();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stopAnimation();
      props.onUnavailable('NYX 2D WebGL context lost');
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);

    syncViewport();

    void loadMasterAsset(controller.signal)
      .then(({ image, texture: loadedTexture }) => {
        if (disposed) {
          loadedTexture.dispose();
          return;
        }
        texture = loadedTexture;
        articulatedBodyTexture = createNyx2DArticulatedBodyTexture(image);
        bodyMaterial.map = articulatedBodyTexture ?? texture;
        bodyMaterial.needsUpdate = true;
        headMaterial.map = texture;
        headMaterial.needsUpdate = true;
        emissiveMaterial.uniforms.uMap.value = articulatedBodyTexture ?? texture;
        if (gazeMaterial) gazeMaterial.uniforms.uMap.value = texture;
        if (blinkMaterial) blinkMaterial.uniforms.uMap.value = texture;
        if (hairMaskDebugMaterial) hairMaskDebugMaterial.uniforms.uMap.value = texture;

        if (articulatedBodyTexture) {
          articulationLayer = createNyx2DArticulationLayer(image);
          scene.add(articulationLayer.root);
          articulationReady = true;
          resetArticulation();
        }

        if (HAIR_MOTION) {
          const mask = createNyx2DHairOverlayMask(image);
          if (mask && mask.maskedPixels >= 96) {
            hairAlphaMap = mask.alphaMap;
            hairMaskedPixels = mask.maskedPixels;
            hairMaterial = createNyx2DHairOverlayMaterial(texture, hairAlphaMap);
            hairPlane = new THREE.Mesh(staticGeometry, hairMaterial);
            hairPlane.position.set(-NYX_2D_HAIR_PIVOT.x, -NYX_2D_HAIR_PIVOT.y, 0.011);
            hairPlane.renderOrder = 8;
            hairGroup.add(hairPlane);
            hairMotionReady = true;
          } else {
            mask?.alphaMap.dispose();
          }
        }

        hiddenSeamTexture = createHiddenSeamTexture(image);
        if (hiddenSeamTexture) {
          hiddenSeamMaterial = new THREE.MeshBasicMaterial({
            map: hiddenSeamTexture,
            transparent: true,
            alphaTest: 0.001,
            depthTest: false,
            depthWrite: false,
            toneMapped: false,
          });
          hiddenSeamPlane = new THREE.Mesh(staticGeometry, hiddenSeamMaterial);
          hiddenSeamPlane.position.z = 0.004;
          hiddenSeamPlane.renderOrder = 2;
          scene.add(hiddenSeamPlane);
          headMotionReady = true;
        }

        ready = true;
        syncRuntime?.();
      })
      .catch((error) => {
        if (disposed || controller.signal.aborted) return;
        props.onUnavailable(errorMessage(error));
      });

    onCleanup(() => {
      disposed = true;
      syncRuntime = undefined;
      stopAnimation();
      controller.abort();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      if (hiddenSeamPlane) scene.remove(hiddenSeamPlane);
      hiddenSeamMaterial?.dispose();
      hiddenSeamTexture?.dispose();
      if (articulationLayer) {
        scene.remove(articulationLayer.root);
        disposeNyx2DArticulationLayer(articulationLayer);
      }
      articulatedBodyTexture?.dispose();
      if (hairPlane) hairGroup.remove(hairPlane);
      hairMaterial?.dispose();
      hairAlphaMap?.dispose();
      texture?.dispose();
      hairMaskDebugMaterial?.dispose();
      debugMaterial?.dispose();
      blinkMaterial?.dispose();
      gazeMaterial?.dispose();
      emissiveMaterial.dispose();
      headMaterial.dispose();
      bodyMaterial.dispose();
      headAlphaMap.dispose();
      bodyAlphaMap.dispose();
      bodyRig.geometry.dispose();
      staticGeometry.dispose();
      renderer.dispose();
    });
  });

  return (
    <div ref={host} class="nyx-2d-webgl" data-nyx-2d-stage="head-body-articulated-arms-gaze-hair-emissive" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
