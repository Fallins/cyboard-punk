import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { render } from 'solid-js/web';
import {
  resetNyx2DRuntimeAttentionTarget,
  setNyx2DRuntimeAttentionTarget,
  type Nyx2DAttentionTarget,
} from './ui/nyx2dAttention';
import Nyx2DManagedRuntime from './ui/Nyx2DManagedRuntime';
import Nyx2DPerformanceMonitor from './ui/Nyx2DPerformanceMonitor';
import {
  nyxStage7FrontPath,
  nyxStage7SilhouettePath,
} from './ui/NyxStage7ExperimentalRuntime';
import type { OperatorRuntimeState } from './ui/operatorRuntime';
import './ui/nyx2d.css';
import './stage7RuntimeHarness.css';

const params = new URLSearchParams(window.location.search);
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

function StaticReference() {
  return (
    <div class="operator-stage stage7-capture-stage" data-capture-mode="reference">
      <div class="nyx-2d-webgl nyx-stage7-reference">
        <svg viewBox="0 0 302 648" preserveAspectRatio="xMidYMid meet" role="presentation">
          <defs>
            <mask
              id="nyx-s7-reference-sil"
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="202"
              height="648"
              style="mask-type: alpha">
              <image href={nyxStage7SilhouettePath} width="202" height="648" />
            </mask>
          </defs>
          <g transform="translate(50 0)" mask="url(#nyx-s7-reference-sil)">
            <image href={nyxStage7FrontPath} width="202" height="648" />
          </g>
        </svg>
      </div>
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
      class="operator-stage stage7-capture-stage"
      data-capture-mode="runtime"
      data-harness-state={state()}
      data-harness-attention={attention()}
      data-harness-reduced={reducedMotion()}
      data-harness-active={active()}
      data-harness-error={runtimeError() ?? undefined}>
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
render(() => (params.get('reference') === '1' ? <StaticReference /> : <RuntimeHarness />), root);
