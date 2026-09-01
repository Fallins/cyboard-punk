import { onCleanup, onMount } from 'solid-js';
import * as THREE from 'three';

export type OperatorRuntimeState = 'idle' | 'working' | 'offline';

interface OperatorWebGLProps {
  mode: 'female' | 'male';
  state: OperatorRuntimeState;
  onUnavailable: () => void;
}

const TARGET_FRAME_MS = 1000 / 30;
const MAX_PIXEL_RATIO = 1.5;

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
  group.name = mode === 'female' ? 'NYX' : 'AXON';

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

  addHologramMesh(
    group,
    new THREE.BoxGeometry(mode === 'female' ? 1.18 : 1.42, 0.13, 0.42),
    cyan,
    0.13,
    [0, -0.18, 0],
  );

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

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const item of materials) item.dispose();
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

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 0.05, 4.6);
    camera.lookAt(0, -0.15, 0);

    const avatar = buildAvatar(props.mode);
    avatar.rotation.x = -0.04;
    scene.add(avatar);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.008, 4, 80),
      material(0x20f6ff, 0.34),
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -0.2;
    scene.add(halo);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    observer?.observe(host);
    resize();

    const motion = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    let frameId = 0;
    let lastFrame = 0;
    let elapsed = 0;

    const renderFrame = (time: number) => {
      const delta = lastFrame === 0 ? 0 : Math.min(100, time - lastFrame);
      elapsed += delta / 1000;
      const state = props.state;
      const working = state === 'working';
      const offline = state === 'offline';
      const core = avatar.getObjectByName('operator-core');

      avatar.rotation.y = Math.sin(elapsed * (working ? 1.25 : 0.55)) * (working ? 0.18 : 0.09);
      avatar.position.y = Math.sin(elapsed * (working ? 2.1 : 1.1)) * (working ? 0.045 : 0.025);
      avatar.scale.setScalar(offline ? 0.985 : 1);
      avatar.visible = true;
      halo.rotation.z = elapsed * (working ? 0.48 : 0.18);
      if (core) {
        const pulse = working ? 1 + Math.sin(elapsed * 5) * 0.16 : 1 + Math.sin(elapsed * 2) * 0.06;
        core.scale.setScalar(pulse);
      }
      renderer.domElement.style.opacity = offline ? '0.38' : '1';
      renderer.render(scene, camera);
    };

    const schedule = () => {
      if (frameId || document.hidden || motion?.matches) return;
      frameId = window.requestAnimationFrame(tick);
    };

    const tick = (time: number) => {
      frameId = 0;
      if (document.hidden || motion?.matches) return;
      if (lastFrame === 0 || time - lastFrame >= TARGET_FRAME_MS) {
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
      document.removeEventListener('visibilitychange', syncRuntime);
      motion?.removeEventListener('change', syncRuntime);
      if (frameId) window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      disposeObject(avatar);
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
