import { onCleanup, onMount } from 'solid-js';
import * as THREE from 'three';
import { nyx2DPosterPath } from './Nyx2DPrototype';
import type { OperatorRuntimeState } from './operatorRuntime';

interface Nyx2DWebGLProps {
  state: OperatorRuntimeState;
  onUnavailable: (reason: string) => void;
}

const MASTER_WIDTH = 941;
const MASTER_HEIGHT = 1672;
const MASTER_ASPECT = MASTER_WIDTH / MASTER_HEIGHT;
const MASTER_SOURCE_BYTES = 588284;
const PIXEL_RATIO_CAP = 2;

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

async function loadMasterTexture(signal: AbortSignal) {
  const image = await loadMasterImage(signal);
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export default function Nyx2DWebGL(props: Nyx2DWebGLProps) {
  let host!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;

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

    const geometry = new THREE.PlaneGeometry(MASTER_ASPECT, 1);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.renderOrder = 1;
    scene.add(plane);

    let texture: THREE.Texture | null = null;
    let disposed = false;
    let ready = false;
    const controller = new AbortController();

    const publishMetrics = (renderMs: number) => {
      host.dataset.asset = ready ? 'master' : 'loading';
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

    const renderStatic = () => {
      if (disposed || !ready || document.hidden) return;
      const started = performance.now();
      renderer.render(scene, camera);
      publishMetrics(Math.max(0, performance.now() - started));
    };

    const resize = () => {
      syncViewport();
      renderStatic();
    };

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(host);
    window.addEventListener('resize', resize);

    const handleVisibility = () => {
      if (!document.hidden) {
        syncViewport();
        renderStatic();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      props.onUnavailable('NYX 2D WebGL context lost');
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);

    syncViewport();

    void loadMasterTexture(controller.signal)
      .then((loadedTexture) => {
        if (disposed) {
          loadedTexture.dispose();
          return;
        }
        texture = loadedTexture;
        material.map = texture;
        material.needsUpdate = true;
        ready = true;
        renderStatic();
      })
      .catch((error) => {
        if (disposed || controller.signal.aborted) return;
        props.onUnavailable(errorMessage(error));
      });

    onCleanup(() => {
      disposed = true;
      controller.abort();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      texture?.dispose();
      material.dispose();
      geometry.dispose();
      renderer.dispose();
    });
  });

  return (
    <div ref={host} class="nyx-2d-webgl" data-nyx-2d-stage="master" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
