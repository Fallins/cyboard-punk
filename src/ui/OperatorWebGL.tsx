import { onCleanup, onMount } from 'solid-js';
import * as THREE from 'three';
import { configureOperatorModel } from './operatorMaterials';
import { createNyxAmbientController, type NyxAmbientController } from './nyxAmbientMotion';
import { OperatorPerformanceGovernor } from './operatorPerformance';
import { operatorAnimationCandidates, operatorAssetPath, type OperatorRuntimeState } from './operatorRuntime';

interface OperatorWebGLProps {
  mode: 'female' | 'male';
  state: OperatorRuntimeState;
  onUnavailable: () => void;
}

const PRODUCTION_TARGET_HEIGHT = 2.7;

function material(color: number, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function wireMaterial(color: number, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    wireframe: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function addHologramMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: number,
  opacity: number,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
  rotation: [number, number, number] = [0, 0, 0],
) {
  const shell = new THREE.Mesh(geometry, material(color, opacity));
  shell.position.set(...position);
  shell.scale.set(...scale);
  shell.rotation.set(...rotation);
  parent.add(shell);

  const wire = new THREE.Mesh(geometry, wireMaterial(color, Math.min(0.82, opacity + 0.24)));
  wire.position.copy(shell.position);
  wire.scale.copy(shell.scale);
  wire.rotation.copy(shell.rotation);
  parent.add(wire);
  return shell;
}

function buildAvatar(mode: 'female' | 'male') {
  const group = new THREE.Group();
  group.name = mode === 'female' ? 'NYX-procedural' : 'AXON-procedural';

  const cyan = 0x20f6ff;
  const violet = 0x8b5cff;
  const magenta = 0xff2fcf;

  addHologramMesh(
    group,
    new THREE.SphereGeometry(0.52, 22, 16),
    mode === 'female' ? violet : cyan,
    0.16,
    [0, 0.72, 0],
    mode === 'female' ? [0.82, 1, 0.82] : [0.92, 1.02, 0.88],
  );

  addHologramMesh(group, new THREE.BoxGeometry(0.58, 0.055, 0.055), cyan, 0.78, [0, 0.76, 0.43]);
  addHologramMesh(group, new THREE.CylinderGeometry(0.13, 0.16, 0.28, 8), violet, 0.18, [0, 0.18, 0]);

  const torsoGeometry = new THREE.CylinderGeometry(
    mode === 'female' ? 0.48 : 0.58,
    mode === 'female' ? 0.7 : 0.82,
    1.14,
    7,
    1,
    false,
  );
  addHologramMesh(
    group,
    torsoGeometry,
    violet,
    0.13,
    [0, -0.52, 0],
    mode === 'female' ? [0.94, 1, 0.55] : [1.04, 1, 0.6],
  );

  addHologramMesh(group, new THREE.BoxGeometry(mode === 'female' ? 1.18 : 1.42, 0.13, 0.42), cyan, 0.13, [0, -0.18, 0]);

  const armGeometry = new THREE.CylinderGeometry(0.09, 0.12, 0.92, 7);
  addHologramMesh(group, armGeometry, cyan, 0.12, [-0.63, -0.55, 0], [1, 1, 1], [0, 0, -0.2]);
  addHologramMesh(group, armGeometry, cyan, 0.12, [0.63, -0.55, 0], [1, 1, 1], [0, 0, 0.2]);

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), material(magenta, 0.72));
  core.name = 'operator-core';
  core.position.set(0, -0.42, 0.42);
  group.add(core);

  if (mode === 'female') {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.57, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      wireMaterial(magenta, 0.38),
    );
    hair.position.set(0, 0.86, -0.02);
    hair.scale.set(0.9, 0.9, 0.9);
    group.add(hair);
  } else {
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.22, 7), wireMaterial(violet, 0.3));
    crown.position.set(0, 1.2, -0.02);
    crown.rotation.x = Math.PI;
    group.add(crown);
  }

  return group;
}

function normalizeProductionModel(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const initialBox = new THREE.Box3().setFromObject(root);
  const initialSize = initialBox.getSize(new THREE.Vector3());
  if (!Number.isFinite(initialSize.y) || initialSize.y <= 0.001) return false;

  const scale = PRODUCTION_TARGET_HEIGHT / initialSize.y;
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
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

async function loadProductionAsset(mode: 'female' | 'male', signal: AbortSignal) {
  const path = operatorAssetPath(mode);
  const response = await fetch(path, { cache: 'force-cache', signal });
  if (!response.ok) return null;
  const bytes = await response.arrayBuffer();
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  const basePath = path.replace(/[^/]+$/, '');
  return new Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[]; bytes: number }>((resolve, reject) => {
    loader.parse(
      bytes,
      basePath,
      (gltf) => resolve({ scene: gltf.scene, animations: gltf.animations, bytes: bytes.byteLength }),
      reject,
    );
  });
}

export default function OperatorWebGL(props: OperatorWebGLProps) {
  let host!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;

  onMount(() => {
    if (typeof window.WebGLRenderingContext === 'undefined') {
      props.onUnavailable();
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
    } catch {
      props.onUnavailable();
      return;
    }

    const governor = new OperatorPerformanceGovernor();
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, governor.profile().pixelRatioCap));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 0.05, 4.6);
    camera.lookAt(0, -0.15, 0);

    const ambient = new THREE.HemisphereLight(0xc7eaff, 0x160d2f, 1.65);
    const keyLight = new THREE.DirectionalLight(0xf2f7ff, 2.5);
    keyLight.position.set(2.4, 3.2, 3.8);
    const cyanRim = new THREE.PointLight(0x20f6ff, 5.5, 8, 2);
    cyanRim.position.set(-2.2, 0.8, 1.2);
    const magentaRim = new THREE.PointLight(0xff2fcf, 4.2, 7, 2);
    magentaRim.position.set(2, -0.1, 0.4);
    scene.add(ambient, keyLight, cyanRim, magentaRim);

    const proceduralAvatar = buildAvatar(props.mode);
    proceduralAvatar.rotation.x = -0.04;
    scene.add(proceduralAvatar);

    let productionAvatar: THREE.Group | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let clips: THREE.AnimationClip[] = [];
    let currentAction: THREE.AnimationAction | null = null;
    let currentClipName: string | null = null;
    let nyxAmbient: NyxAmbientController | null = null;
    let disposed = false;
    const assetController = new AbortController();
    const assetLoadStarted = performance.now();

    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.008, 4, 80), material(0x20f6ff, 0.34));
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -0.2;
    scene.add(halo);

    const syncViewport = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const applyQualityProfile = () => {
      const profile = governor.profile();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.pixelRatioCap));
      host.dataset.quality = profile.level;
      host.dataset.targetFps = String(Math.round(1000 / profile.targetFrameMs));
      syncViewport();
    };

    const publishMetrics = (renderMs: number) => {
      host.dataset.renderMs = renderMs.toFixed(2);
      host.dataset.averageRenderMs = governor.averageRenderMs().toFixed(2);
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.triangles = String(renderer.info.render.triangles);
      host.dataset.geometries = String(renderer.info.memory.geometries);
      host.dataset.textures = String(renderer.info.memory.textures);
      host.dataset.asset = productionAvatar ? 'glb' : 'procedural';
      if (nyxAmbient) {
        host.dataset.nyxGaze = String(nyxAmbient.hasGaze);
        host.dataset.nyxBreath = String(nyxAmbient.hasBreath);
      }
    };

    const playProductionState = (state: OperatorRuntimeState) => {
      if (!mixer || clips.length === 0) return;
      const lookup = new Map(clips.map((clip) => [clip.name.toLowerCase(), clip]));
      const clip = operatorAnimationCandidates(state)
        .map((name) => lookup.get(name.toLowerCase()))
        .find((candidate): candidate is THREE.AnimationClip => Boolean(candidate));
      if (!clip || currentClipName === clip.name) return;

      const next = mixer.clipAction(clip);
      next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.2).play();
      currentAction?.fadeOut(0.2);
      currentAction = next;
      currentClipName = clip.name;
    };

    host.dataset.asset = 'procedural';
    applyQualityProfile();

    void loadProductionAsset(props.mode, assetController.signal)
      .then((loaded) => {
        if (!loaded) return;
        if (disposed) {
          disposeObject(loaded.scene);
          return;
        }

        configureOperatorModel(loaded.scene);
        if (!normalizeProductionModel(loaded.scene)) {
          disposeObject(loaded.scene);
          return;
        }

        loaded.scene.name = props.mode === 'female' ? 'NYX-production' : 'AXON-production';
        productionAvatar = loaded.scene;
        clips = loaded.animations;
        mixer = clips.length > 0 ? new THREE.AnimationMixer(loaded.scene) : null;
        nyxAmbient = props.mode === 'female' ? createNyxAmbientController(loaded.scene) : null;
        proceduralAvatar.visible = false;
        scene.add(loaded.scene);
        host.dataset.asset = 'glb';
        host.dataset.assetBytes = String(loaded.bytes);
        host.dataset.loadMs = (performance.now() - assetLoadStarted).toFixed(2);
        playProductionState(props.state);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        proceduralAvatar.visible = true;
        host.dataset.asset = 'procedural';
      });

    const handleContextLoss = (event: Event) => {
      event.preventDefault();
      props.onUnavailable();
    };
    canvas.addEventListener('webglcontextlost', handleContextLoss);

    const resize = () => {
      syncViewport();
      renderer.render(scene, camera);
    };

    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    observer?.observe(host);
    resize();

    const motion =
      typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    let frameId = 0;
    let lastFrame = 0;
    let elapsed = 0;
    let lastMetricsAt = 0;

    const renderFrame = (time: number) => {
      const renderStarted = performance.now();
      const deltaMs = lastFrame === 0 ? 0 : Math.min(100, time - lastFrame);
      const deltaSeconds = deltaMs / 1000;
      elapsed += deltaSeconds;
      const state = props.state;
      const processing = state === 'processing';
      const warning = state === 'warning';
      const offline = state === 'offline';
      const core = proceduralAvatar.getObjectByName('operator-core');

      if (productionAvatar) {
        playProductionState(state);
        nyxAmbient?.prepare();
        mixer?.update(deltaSeconds);
        if (!motion?.matches) nyxAmbient?.apply(elapsed, state);
        productionAvatar.visible = true;
      } else {
        proceduralAvatar.rotation.y = Math.sin(elapsed * (processing ? 1.25 : 0.55)) * (processing ? 0.18 : 0.09);
        proceduralAvatar.position.y = Math.sin(elapsed * (processing ? 2.1 : 1.1)) * (processing ? 0.045 : 0.025);
        proceduralAvatar.scale.setScalar(offline ? 0.985 : 1);
        proceduralAvatar.visible = true;
        if (core) {
          const pulse = processing
            ? 1 + Math.sin(elapsed * 5) * 0.16
            : warning
              ? 1 + Math.sin(elapsed * 3.5) * 0.1
              : 1 + Math.sin(elapsed * 2) * 0.06;
          core.scale.setScalar(pulse);
        }
      }

      halo.rotation.z = elapsed * (processing ? 0.48 : warning ? 0.32 : 0.18);
      renderer.domElement.style.opacity = offline ? '0.38' : warning ? '0.82' : '1';
      renderer.render(scene, camera);

      const renderMs = Math.max(0, performance.now() - renderStarted);
      const qualityChanged = governor.recordRender(renderMs);
      if (qualityChanged) applyQualityProfile();
      if (qualityChanged || time - lastMetricsAt >= 2000) {
        publishMetrics(renderMs);
        lastMetricsAt = time;
      }
    };

    const schedule = () => {
      if (frameId || document.hidden || motion?.matches) return;
      frameId = window.requestAnimationFrame(tick);
    };

    const tick = (time: number) => {
      frameId = 0;
      if (document.hidden || motion?.matches) return;
      if (lastFrame === 0 || time - lastFrame >= governor.profile().targetFrameMs) {
        renderFrame(time);
        lastFrame = time;
      }
      schedule();
    };

    const syncRuntime = () => {
      if (document.hidden) {
        if (frameId) window.cancelAnimationFrame(frameId);
        frameId = 0;
        return;
      }
      if (motion?.matches) {
        if (frameId) window.cancelAnimationFrame(frameId);
        frameId = 0;
        renderFrame(performance.now());
        return;
      }
      schedule();
    };

    document.addEventListener('visibilitychange', syncRuntime);
    motion?.addEventListener('change', syncRuntime);
    syncRuntime();

    onCleanup(() => {
      disposed = true;
      assetController.abort();
      canvas.removeEventListener('webglcontextlost', handleContextLoss);
      document.removeEventListener('visibilitychange', syncRuntime);
      motion?.removeEventListener('change', syncRuntime);
      if (frameId) window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      currentAction?.stop();
      mixer?.stopAllAction();
      if (productionAvatar) disposeObject(productionAvatar);
      disposeObject(proceduralAvatar);
      disposeObject(halo);
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
    });
  });

  return (
    <div class="operator-webgl" ref={host} aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
