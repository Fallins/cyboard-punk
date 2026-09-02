import { createEffect, onCleanup, onMount } from 'solid-js';
import * as THREE from 'three';
import { configureOperatorModel } from './operatorMaterials';
import { createNyxAmbientController, type NyxAmbientController } from './nyxAmbientMotion';
import { OperatorPerformanceGovernor } from './operatorPerformance';
import { operatorAnimationCandidates, operatorAssetPath, type OperatorRuntimeState } from './operatorRuntime';

interface NyxProductionWebGLProps {
  state: OperatorRuntimeState;
  onUnavailable: (reason: string) => void;
}

const TARGET_HEIGHT = 2.7;
const MIN_MODEL_HEIGHT = 1e-8;

function normalizeNyx(root: THREE.Object3D): boolean {
  root.updateMatrixWorld(true);
  const initialBox = new THREE.Box3().setFromObject(root);
  if (initialBox.isEmpty()) return false;

  const initialSize = initialBox.getSize(new THREE.Vector3());
  if (!Number.isFinite(initialSize.y) || initialSize.y <= MIN_MODEL_HEIGHT) return false;

  const scale = TARGET_HEIGHT / initialSize.y;
  if (!Number.isFinite(scale) || scale <= 0 || scale > 1e8) return false;
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);

  const normalizedBox = new THREE.Box3().setFromObject(root);
  if (normalizedBox.isEmpty()) return false;
  const center = normalizedBox.getCenter(new THREE.Vector3());
  if (![center.x, center.y, center.z].every(Number.isFinite)) return false;

  root.position.x -= center.x;
  root.position.y += -0.05 - center.y;
  root.position.z -= center.z;
  root.updateMatrixWorld(true);
  return true;
}

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const item of meshMaterials) {
      materials.add(item);
      for (const value of Object.values(item)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });

  for (const texture of textures) texture.dispose();
  for (const item of materials) item.dispose();
  for (const geometry of geometries) geometry.dispose();
}

async function loadNyx(signal: AbortSignal) {
  const path = operatorAssetPath('female');
  const response = await fetch(path, {
    cache: import.meta.env.DEV ? 'no-store' : 'force-cache',
    signal,
  });
  if (!response.ok) throw new Error(`NYX GLB request failed with HTTP ${response.status}`);

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength < 20) throw new Error(`NYX GLB response is too small (${bytes.byteLength} bytes)`);

  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  const basePath = path.replace(/[^/]+$/, '');
  const parsed = await new Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>((resolve, reject) => {
    loader.parse(
      bytes,
      basePath,
      (gltf) => resolve({ scene: gltf.scene, animations: gltf.animations }),
      (error) => reject(error instanceof Error ? error : new Error(String(error))),
    );
  });

  return { ...parsed, bytes: bytes.byteLength };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return String(error || 'unknown NYX renderer error');
}

export default function NyxProductionWebGL(props: NyxProductionWebGLProps) {
  let host!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  let renderStatic: (() => void) | undefined;

  createEffect(() => {
    props.state;
    renderStatic?.();
  });

  onMount(() => {
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
    } catch (error) {
      props.onUnavailable(`WebGL renderer initialization failed: ${errorMessage(error)}`);
      return;
    }

    const governor = new OperatorPerformanceGovernor();
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 0.05, 4.6);
    camera.lookAt(0, -0.15, 0);

    const ambientLight = new THREE.HemisphereLight(0xc7eaff, 0x160d2f, 1.65);
    const keyLight = new THREE.DirectionalLight(0xf2f7ff, 2.5);
    keyLight.position.set(2.4, 3.2, 3.8);
    const cyanRim = new THREE.PointLight(0x20f6ff, 5.5, 8, 2);
    cyanRim.position.set(-2.2, 0.8, 1.2);
    const magentaRim = new THREE.PointLight(0xff2fcf, 4.2, 7, 2);
    magentaRim.position.set(2, -0.1, 0.4);
    scene.add(ambientLight, keyLight, cyanRim, magentaRim);

    let model: THREE.Group | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let ambient: NyxAmbientController | null = null;
    let clips: THREE.AnimationClip[] = [];
    let currentAction: THREE.AnimationAction | null = null;
    let currentClipName: string | null = null;
    let disposed = false;
    let frameId = 0;
    let lastFrame = 0;
    let elapsed = 0;
    let lastMetricsAt = 0;
    const controller = new AbortController();
    const motion = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    const syncViewport = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, governor.profile().pixelRatioCap));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const playState = () => {
      if (!mixer || clips.length === 0) return;
      const lookup = new Map(clips.map((clip) => [clip.name.toLowerCase(), clip]));
      const clip = operatorAnimationCandidates(props.state)
        .map((name) => lookup.get(name.toLowerCase()))
        .find((candidate): candidate is THREE.AnimationClip => Boolean(candidate));
      if (!clip || currentClipName === clip.name) return;

      const next = mixer.clipAction(clip);
      next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.2).play();
      currentAction?.fadeOut(0.2);
      currentAction = next;
      currentClipName = clip.name;
    };

    const publishMetrics = (renderMs: number) => {
      host.dataset.asset = model ? 'glb' : 'loading';
      host.dataset.renderMs = renderMs.toFixed(2);
      host.dataset.averageRenderMs = governor.averageRenderMs().toFixed(2);
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.triangles = String(renderer.info.render.triangles);
      host.dataset.geometries = String(renderer.info.memory.geometries);
      host.dataset.textures = String(renderer.info.memory.textures);
      host.dataset.quality = governor.profile().level;
      host.dataset.targetFps = String(Math.round(1000 / governor.profile().targetFrameMs));
    };

    const renderFrame = (time: number, advanceAnimation: boolean) => {
      if (!model) return;
      const started = performance.now();
      const deltaMs = lastFrame === 0 ? 0 : Math.min(100, Math.max(0, time - lastFrame));
      const deltaSeconds = deltaMs / 1000;
      if (advanceAnimation) elapsed += deltaSeconds;

      playState();
      ambient?.prepare();
      if (advanceAnimation) {
        mixer?.update(deltaSeconds);
        ambient?.apply(elapsed, props.state);
      } else {
        mixer?.update(0);
      }

      renderer.domElement.style.opacity = props.state === 'offline' ? '0.38' : props.state === 'warning' ? '0.82' : '1';
      renderer.render(scene, camera);

      const renderMs = Math.max(0, performance.now() - started);
      const qualityChanged = governor.recordRender(renderMs);
      if (qualityChanged) syncViewport();
      if (qualityChanged || time - lastMetricsAt >= 2000) {
        publishMetrics(renderMs);
        lastMetricsAt = time;
      }
    };

    const schedule = () => {
      if (frameId || disposed || document.hidden || motion?.matches || !model) return;
      frameId = window.requestAnimationFrame(tick);
    };

    const tick = (time: number) => {
      frameId = 0;
      if (disposed || document.hidden || motion?.matches || !model) return;
      if (lastFrame === 0 || time - lastFrame >= governor.profile().targetFrameMs) {
        renderFrame(time, true);
        lastFrame = time;
      }
      schedule();
    };

    const syncRuntime = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      if (document.hidden || !model) return;
      if (motion?.matches) {
        renderFrame(performance.now(), false);
      } else {
        lastFrame = 0;
        schedule();
      }
    };

    renderStatic = () => {
      if (model && !disposed && !document.hidden && motion?.matches) {
        renderFrame(performance.now(), false);
      }
    };

    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
      syncViewport();
      if (model) renderFrame(performance.now(), false);
    }) : null;
    observer?.observe(host);
    syncViewport();

    document.addEventListener('visibilitychange', syncRuntime);
    motion?.addEventListener('change', syncRuntime);

    const loadStarted = performance.now();
    host.dataset.asset = 'loading';
    void loadNyx(controller.signal)
      .then((loaded) => {
        if (disposed) {
          disposeObject(loaded.scene);
          return;
        }

        configureOperatorModel(loaded.scene);
        if (!normalizeNyx(loaded.scene)) {
          disposeObject(loaded.scene);
          throw new Error('NYX model bounds are empty, non-finite, or cannot be normalized');
        }

        loaded.scene.name = 'NYX-production';
        model = loaded.scene;
        clips = loaded.animations;
        mixer = clips.length > 0 ? new THREE.AnimationMixer(model) : null;
        ambient = createNyxAmbientController(model);
        scene.add(model);
        host.dataset.asset = 'glb';
        host.dataset.assetBytes = String(loaded.bytes);
        host.dataset.loadMs = (performance.now() - loadStarted).toFixed(2);
        host.dataset.animationCount = String(clips.length);
        host.dataset.nyxGaze = String(ambient.hasGaze);
        host.dataset.nyxBreath = String(ambient.hasBreath);
        playState();
        syncViewport();
        renderFrame(performance.now(), false);
        syncRuntime();
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (disposed) return;
        const reason = errorMessage(error);
        host.dataset.asset = 'fallback';
        host.dataset.assetError = reason;
        console.warn(`[CYBOARD] NYX production renderer failed: ${reason}`);
        props.onUnavailable(reason);
      });

    const handleContextLoss = (event: Event) => {
      event.preventDefault();
      props.onUnavailable('WebGL context was lost');
    };
    canvas.addEventListener('webglcontextlost', handleContextLoss);

    onCleanup(() => {
      disposed = true;
      renderStatic = undefined;
      controller.abort();
      if (frameId) window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', syncRuntime);
      motion?.removeEventListener('change', syncRuntime);
      canvas.removeEventListener('webglcontextlost', handleContextLoss);
      currentAction?.stop();
      mixer?.stopAllAction();
      if (model) disposeObject(model);
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
    });
  });

  return (
    <div class="operator-webgl operator-webgl--nyx" ref={host} aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
