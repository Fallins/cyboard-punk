import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { render } from 'solid-js/web';
import {
  resetNyx2DRuntimeAttentionTarget,
  setNyx2DRuntimeAttentionTarget,
  type Nyx2DAttentionTarget,
} from './ui/nyx2dAttention';
import Nyx2DManagedRuntime from './ui/Nyx2DManagedRuntime';
import Nyx2DPerformanceMonitor from './ui/Nyx2DPerformanceMonitor';
import { nyxStage7FrontPath } from './ui/NyxStage7ExperimentalRuntime';
import {
  NYX_STAGE7_CANVAS_WIDTH,
  NYX_STAGE7_SILHOUETTE_BASE_D,
  NYX_STAGE7_SILHOUETTE_RIGHT_ARM_D,
  NYX_STAGE7_SOURCE_HEIGHT,
  NYX_STAGE7_SOURCE_OFFSET_X,
} from './ui/nyxStage7Geometry';
import type { OperatorRuntimeState } from './ui/operatorRuntime';
import './ui/operator.css';
import './ui/nyx2d.css';
import './stage7RuntimeHarness.css';

const params = new URLSearchParams(window.location.search);
const dashboardLayout = params.get('layout') === 'dashboard';
const blankLayout = params.get('blank') === '1';
document.documentElement.dataset.stage7Layout = dashboardLayout ? 'dashboard' : 'capture';

const validStates = new Set<OperatorRuntimeState>([
  'idle',
  'observing',
  'processing',
  'warning',
  'success',
  'offline',
]);
const validTargets = new Set<Nyx2DAttentionTarget>(['center', 'codex', 'claude', 'cursor']);

function stateParam(): OperatorRuntimeState {
  const value = params.get('state') as OperatorRuntimeState | null;
  return value && validStates.has(value) ? value : 'idle';
}

function attentionParam(): Nyx2DAttentionTarget {
  const value = params.get('attention') as Nyx2DAttentionTarget | null;
  return value && validTargets.has(value) ? value : 'center';
}

function stageClass() {
  return `operator-stage stage7-capture-stage${dashboardLayout ? ' stage7-capture-stage--dashboard' : ''}`;
}

function DashboardChrome() {
  return (
    <Show when={dashboardLayout}>
      <div class="operator-halo operator-halo--outer" />
      <div class="operator-halo operator-halo--inner" />
      <div class="operator-scanline" />
      <div class="operator-provider-panels stage7-dashboard-provider-panels" aria-hidden="true">
        <div class="operator-provider-panel operator-provider-panel--active">
          <span class="operator-provider-panel__name">CODEX</span><strong>68%</strong><small>LIVE</small>
        </div>
        <div class="operator-provider-panel">
          <span class="operator-provider-panel__name">CLAUDE</span><strong>54%</strong><small>READY</small>
        </div>
        <div class="operator-provider-panel">
          <span class="operator-provider-panel__name">CURSOR</span><strong>81%</strong><small>READY</small>
        </div>
        <div class="operator-provider-panel">
          <span class="operator-provider-panel__name">RESET</span><strong>42m</strong><small>NEXT</small>
        </div>
      </div>
      <div class="stage7-dashboard-actions" aria-hidden="true">
        <span>推薦 Provider</span>
        <span>下次重置</span>
        <span>ACTIVE AGENTS</span>
        <span>近期 Project</span>
      </div>
    </Show>
  );
}

function StaticReference() {
  return (
    <div class={stageClass()} data-capture-mode="reference" data-layout={dashboardLayout ? 'dashboard' : 'capture'}>
      <DashboardChrome />
      <div class="nyx-2d-webgl nyx-stage7-reference">
        <svg
          viewBox={`0 0 ${NYX_STAGE7_CANVAS_WIDTH} ${NYX_STAGE7_SOURCE_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          role="presentation">
          <defs>
            <clipPath id="nyx-s7-reference-sil" clipPathUnits="userSpaceOnUse">
              <path d={NYX_STAGE7_SILHOUETTE_BASE_D} />
              <path d={NYX_STAGE7_SILHOUETTE_RIGHT_ARM_D} />
            </clipPath>
          </defs>
          <g transform={`translate(${NYX_STAGE7_SOURCE_OFFSET_X} 0)`} clip-path="url(#nyx-s7-reference-sil)">
            <image href={nyxStage7FrontPath} width="202" height="648" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function BlankReference() {
  return (
    <div class={stageClass()} data-capture-mode="blank" data-layout={dashboardLayout ? 'dashboard' : 'capture'}>
      <DashboardChrome />
    </div>
  );
}

function RuntimeHarness() {
  const [state, setState] = createSignal<OperatorRuntimeState>(stateParam());
  const [attention, setAttention] = createSignal<Nyx2DAttentionTarget>(attentionParam());
  const [reducedMotion, setReducedMotion] = createSignal(params.get('reduced') === '1');
  const [active, setActive] = createSignal(true);
  const [runtimeError, setRuntimeError] = createSignal<string | null>(null);

  createEffect(() => {
    setNyx2DRuntimeAttentionTarget(attention());
  });

  onMount(() => {
    window.__NYX_STAGE7_HARNESS__ = {
      setState: (value) => {
        if (validStates.has(value)) setState(value);
      },
      setAttention: (value) => {
        if (validTargets.has(value)) setAttention(value);
      },
      setReducedMotion,
      setActive,
    };
  });

  onCleanup(() => {
    resetNyx2DRuntimeAttentionTarget();
    delete window.__NYX_STAGE7_HARNESS__;
  });

  return (
    <div
      class={stageClass()}
      data-capture-mode="runtime"
      data-layout={dashboardLayout ? 'dashboard' : 'capture'}
      data-harness-state={state()}
      data-harness-attention={attention()}
      data-harness-reduced={reducedMotion()}
      data-harness-active={active()}
      data-harness-error={runtimeError() ?? undefined}>
      <DashboardChrome />
      <Nyx2DManagedRuntime
        state={state()}
        active={active()}
        reducedMotion={reducedMotion()}
        onUnavailable={setRuntimeError}
      />
      <Nyx2DPerformanceMonitor profile="stable" />
    </div>
  );
}

declare global {
  interface Window {
    __NYX_STAGE7_HARNESS__?: {
      setState: (value: OperatorRuntimeState) => void;
      setAttention: (value: Nyx2DAttentionTarget) => void;
      setReducedMotion: (value: boolean) => void;
      setActive: (value: boolean) => void;
    };
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Stage 7 runtime harness root is missing');
render(() => blankLayout ? <BlankReference /> : params.get('reference') === '1' ? <StaticReference /> : <RuntimeHarness />, root);
