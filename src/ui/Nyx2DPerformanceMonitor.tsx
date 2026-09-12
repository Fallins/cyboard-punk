import { onCleanup, onMount } from 'solid-js';
import {
  createNyx2DPerformanceGuardState,
  NYX_2D_ENHANCED_PERFORMANCE_BUDGET,
  NYX_2D_STABLE_PERFORMANCE_BUDGET,
  resetNyx2DPerformanceGuard,
  sampleNyx2DPerformanceGuard,
  type Nyx2DPerformanceSnapshot,
} from './nyx2dPerformance';
import type { Nyx2DRuntimeProfile } from './nyx2dProfile';

interface Nyx2DPerformanceMonitorProps {
  profile: Nyx2DRuntimeProfile;
}

function readFiniteNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readSnapshot(rendererHost: HTMLElement): Nyx2DPerformanceSnapshot | null {
  const drawCalls = readFiniteNumber(rendererHost.dataset.drawCalls);
  const triangles = readFiniteNumber(rendererHost.dataset.triangles);
  const geometries = readFiniteNumber(rendererHost.dataset.geometries);
  const textures = readFiniteNumber(rendererHost.dataset.textures);
  const renderMs = readFiniteNumber(rendererHost.dataset.renderMs);
  if (
    drawCalls === null ||
    triangles === null ||
    geometries === null ||
    textures === null ||
    renderMs === null
  ) return null;

  return { drawCalls, triangles, geometries, textures, renderMs };
}

export default function Nyx2DPerformanceMonitor(props: Nyx2DPerformanceMonitorProps) {
  let anchor!: HTMLSpanElement;

  onMount(() => {
    const stage = anchor.closest<HTMLElement>('.operator-stage');
    if (!stage || typeof MutationObserver === 'undefined') return;

    const guard = createNyx2DPerformanceGuardState();
    let lastWarning = false;
    let rendererHost: HTMLElement | null = null;
    let rendererObserver: MutationObserver | null = null;

    const publishPaused = () => {
      resetNyx2DPerformanceGuard(guard);
      stage.dataset.nyx2dPerformance = 'paused';
      stage.dataset.nyx2dPerformanceViolations = '';
      stage.dataset.nyx2dPerformanceStreak = '0';
      lastWarning = false;
    };

    const sample = () => {
      if (stage.dataset.nyx2dLifecycle !== 'animated') {
        publishPaused();
        return;
      }
      if (!rendererHost) return;

      const snapshot = readSnapshot(rendererHost);
      if (!snapshot) return;

      const budget = props.profile === 'enhanced'
        ? NYX_2D_ENHANCED_PERFORMANCE_BUDGET
        : NYX_2D_STABLE_PERFORMANCE_BUDGET;
      sampleNyx2DPerformanceGuard(guard, snapshot, budget);

      stage.dataset.nyx2dPerformance = guard.warning ? 'warning' : 'ok';
      stage.dataset.nyx2dPerformanceViolations = guard.warning ? guard.violations.join('; ') : '';
      stage.dataset.nyx2dPerformanceStreak = String(guard.consecutiveViolations);

      if (guard.warning && !lastWarning) {
        console.warn(`[NYX 2D] sustained ${props.profile} performance budget violation: ${guard.violations.join(', ')}`);
      }
      lastWarning = guard.warning;
    };

    const attachRenderer = () => {
      const nextRendererHost = stage.querySelector<HTMLElement>('.nyx-2d-webgl');
      if (nextRendererHost === rendererHost) return;

      rendererObserver?.disconnect();
      rendererObserver = null;
      rendererHost = nextRendererHost;
      resetNyx2DPerformanceGuard(guard);
      lastWarning = false;

      if (rendererHost) {
        rendererObserver = new MutationObserver(sample);
        rendererObserver.observe(rendererHost, {
          attributes: true,
          attributeFilter: [
            'data-draw-calls',
            'data-triangles',
            'data-geometries',
            'data-textures',
            'data-render-ms',
          ],
        });
      }
      sample();
    };

    const rendererHostObserver = new MutationObserver(attachRenderer);
    rendererHostObserver.observe(stage, { childList: true, subtree: true });

    const lifecycleObserver = new MutationObserver(sample);
    lifecycleObserver.observe(stage, {
      attributes: true,
      attributeFilter: ['data-nyx2d-lifecycle'],
    });

    attachRenderer();

    onCleanup(() => {
      rendererObserver?.disconnect();
      rendererHostObserver.disconnect();
      lifecycleObserver.disconnect();
      delete stage.dataset.nyx2dPerformance;
      delete stage.dataset.nyx2dPerformanceViolations;
      delete stage.dataset.nyx2dPerformanceStreak;
    });
  });

  return <span ref={anchor} hidden aria-hidden="true" />;
}
