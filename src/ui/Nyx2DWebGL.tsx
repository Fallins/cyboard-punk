import { createEffect, onCleanup, onMount } from 'solid-js';
import * as THREE from 'three';
import { nyx2DBreathEnabled, nyx2DBreathPoseAtTime, nyx2DShouldAnimateBreath } from './nyx2dBreath';
import { createNyx2DRigDebugMaterial, nyx2DRigDebugEnabled } from './nyx2dDebug';
import {
  applyNyx2DBreathPose,
  createNyx2DBodyGeometryRig,
  resetNyx2DBodyGeometry,
} from './nyx2dGeometry';
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
const EFFECT_FPS = 24;
const RIG_DEBUG = nyx2DRigDebugEnabled(import.meta.env.VITE_NYX_2D_RIG_DEBUG);
const HEAD_MOTION = nyx2DHeadMotionEnabled(import.meta.env.VITE_NYX_2D_HEAD_MOTION);
const BODY_MOTION = nyx2DBreathEnabled(import.meta.env.VITE_NYX_2D_BREATH);

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return String(error || 'unknown NYX 2D renderer error');
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
    scene.add(headGroup);

    const emissiveMaterial = createEmissiveMaterial();
    const emissivePlane = new THREE.Mesh(bodyRig.geometry, emissiveMaterial);
    emissivePlane.position.z = 0.01;
    emissivePlane.renderOrder = 4;
    scene.add(emissivePlane);

    const debugMaterial = RIG_DEBUG ? createNyx2DRigDebugMaterial() : null;
    const debugPlane = debugMaterial ? new THREE.Mesh(staticGeometry, debugMaterial) : null;
    if (debugPlane) {
      debugPlane.position.z = 0.02;
      debugPlane.renderOrder = 5;
      scene.add(debugPlane);
    }

    let texture: THREE.Texture | null = null;
    let disposed = false;
    let ready = false;
    let intersecting = true;
    let rafId = 0;
    let animationEpoch = 0;
    let lastAnimatedFrame = 0;
    const controller = new AbortController();
    const frameInterval = nyx2DFrameIntervalMs(EFFECT_FPS);

    const isVisible = () => props.active && intersecting && !document.hidden;
    const canAnimateHead = () =>
      nyx2DShouldAnimateHead(props.state, true, props.reducedMotion, HEAD_MOTION && headMotionReady);
    const canAnimateBody = () =>
      nyx2DShouldAnimateBreath(props.state, true, props.reducedMotion, BODY_MOTION);
    const canAnimateEffects = () => nyx2DShouldAnimateEffects(props.state, true, props.reducedMotion);
    const shouldAnimateRuntime = () =>
      isVisible() && (canAnimateHead() || canAnimateBody() || canAnimateEffects());

    const resetHeadPose = () => {
      headGroup.position.set(headPivotX, headPivotY, 0);
      headGroup.rotation.z = 0;
    };

    const applyHeadPose = (elapsedMs: number, animated: boolean) => {
      if (!animated || !canAnimateHead()) {
        resetHeadPose();
        return;
      }
      const pose = nyx2DHeadPoseAtTime(props.state, elapsedMs);
      headGroup.position.set(headPivotX + pose.x, headPivotY + pose.y, 0);
      headGroup.rotation.z = pose.rotationRad;
    };

    const resetBodyPose = () => {
      resetNyx2DBodyGeometry(bodyRig);
    };

    const applyBodyPose = (elapsedMs: number, animated: boolean) => {
      if (!animated || !canAnimateBody()) {
        resetBodyPose();
        return;
      }
      applyNyx2DBreathPose(bodyRig, nyx2DBreathPoseAtTime(props.state, elapsedMs));
    };

    const publishMetrics = (renderMs: number, animated: boolean) => {
      host.dataset.asset = ready ? 'head-body-emissive' : 'loading';
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
      host.dataset.effectIntensity = emissiveMaterial.uniforms.uIntensity.value.toFixed(3);
      host.dataset.effectAnimated = String(animated && canAnimateEffects());
      host.dataset.headMotionRequested = String(HEAD_MOTION);
      host.dataset.headMotionReady = String(headMotionReady);
      host.dataset.headMotionAnimated = String(animated && canAnimateHead());
      host.dataset.bodyMotionRequested = String(BODY_MOTION);
      host.dataset.bodyMotionAnimated = String(animated && canAnimateBody());
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
      const intensity = animated && canAnimateEffects()
        ? nyx2DEmissiveAtTime(props.state, elapsedMs)
        : nyx2DEmissiveIntensity(props.state);
      emissiveMaterial.uniforms.uIntensity.value = intensity;
      applyBodyPose(elapsedMs, animated);
      applyHeadPose(elapsedMs, animated);
      const started = performance.now();
      renderer.render(scene, camera);
      publishMetrics(Math.max(0, performance.now() - started), animated);
    };

    const renderStatic = () => {
      renderNow(0, false);
    };

    const stopAnimation = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      animationEpoch = 0;
      lastAnimatedFrame = 0;
      resetHeadPose();
      resetBodyPose();
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
        bodyMaterial.map = texture;
        bodyMaterial.needsUpdate = true;
        headMaterial.map = texture;
        headMaterial.needsUpdate = true;
        emissiveMaterial.uniforms.uMap.value = texture;

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
      texture?.dispose();
      debugMaterial?.dispose();
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
    <div ref={host} class="nyx-2d-webgl" data-nyx-2d-stage="head-body-emissive" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
