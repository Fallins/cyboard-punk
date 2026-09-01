import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import type { OperatorMode } from '../settings/settings';
import OperatorWebGL from './OperatorWebGL';
import {
  operatorPosterPath,
  resolveOperatorRuntimeState,
  type OperatorProviderPanel,
  type OperatorTransientState,
} from './operatorRuntime';
import './operator.css';
import './operator-states.css';

interface OperatorStageProps {
  mode: Exclude<OperatorMode, 'off'>;
  readyProviders: number;
  totalProviders: number;
  activeAgents: number;
  providers: OperatorProviderPanel[];
  transientState?: OperatorTransientState;
}

function ProceduralFallback(props: { mode: 'female' | 'male' }) {
  return (
    <div class="operator-avatar" aria-hidden="true">
      <div class="operator-head">
        <span class="operator-visor" />
        <span class="operator-ear operator-ear--left" />
        <span class="operator-ear operator-ear--right" />
      </div>
      <div class="operator-neck" />
      <div class="operator-torso">
        <span class="operator-core-light" />
        <span class="operator-shoulder operator-shoulder--left" />
        <span class="operator-shoulder operator-shoulder--right" />
      </div>
      <span class="sr-only">{props.mode} fallback operator</span>
    </div>
  );
}

function StaticOperatorFallback(props: { mode: 'female' | 'male' }) {
  const [posterUnavailable, setPosterUnavailable] = createSignal(false);
  return (
    <Show when={!posterUnavailable()} fallback={<ProceduralFallback mode={props.mode} />}>
      <img
        class="operator-poster"
        src={operatorPosterPath(props.mode)}
        alt=""
        aria-hidden="true"
        onError={() => setPosterUnavailable(true)}
      />
    </Show>
  );
}

function ProviderHudPanel(props: { panel: OperatorProviderPanel }) {
  return (
    <div
      class={`operator-provider-panel operator-provider-panel--${props.panel.state}`}
      data-provider={props.panel.provider}
    >
      <span class="operator-provider-panel__name">{props.panel.label}</span>
      <Show
        when={props.panel.remainingPercent !== undefined}
        fallback={<strong>OFFLINE</strong>}
      >
        <strong>{Math.round(props.panel.remainingPercent!)}% LEFT</strong>
      </Show>
      <small>{props.panel.state.toUpperCase()}</small>
    </div>
  );
}

export default function OperatorStage(props: OperatorStageProps) {
  const [visible, setVisible] = createSignal(true);
  const [reducedMotion, setReducedMotion] = createSignal(false);
  const [webglUnavailable, setWebglUnavailable] = createSignal(false);

  onMount(() => {
    const media = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    const syncMotion = () => setReducedMotion(media?.matches ?? false);
    const syncVisibility = () => setVisible(!document.hidden);
    syncMotion();
    syncVisibility();
    media?.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    onCleanup(() => {
      media?.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncVisibility);
    });
  });

  createEffect(() => {
    document.documentElement.dataset.operatorMotion = visible() && !reducedMotion() ? 'active' : 'paused';
  });

  const state = () =>
    resolveOperatorRuntimeState({
      readyProviders: props.readyProviders,
      totalProviders: props.totalProviders,
      activeAgents: props.activeAgents,
      transientState: props.transientState,
    });

  const operatorName = () => props.mode === 'female' ? 'NYX' : 'AXON';

  return (
    <div
      class={`operator-stage operator-stage--${props.mode} operator-stage--${state()}`}
      data-paused={!visible() || reducedMotion()}
      data-renderer={reducedMotion() ? 'static' : webglUnavailable() ? 'fallback' : 'webgl'}
      aria-label={`${operatorName()} CYBOARD operator, ${state()}`}
    >
      <div class="operator-halo operator-halo--outer" />
      <div class="operator-halo operator-halo--inner" />
      <div class="operator-scanline" />

      <Show
        when={!reducedMotion() && !webglUnavailable()}
        fallback={<StaticOperatorFallback mode={props.mode} />}
      >
        <Show
          when={props.mode === 'female'}
          fallback={<OperatorWebGL mode="male" state={state()} onUnavailable={() => setWebglUnavailable(true)} />}
        >
          <OperatorWebGL mode="female" state={state()} onUnavailable={() => setWebglUnavailable(true)} />
        </Show>
      </Show>

      <div class="operator-provider-panels" aria-hidden="true">
        <For each={props.providers}>{(panel) => <ProviderHudPanel panel={panel} />}</For>
      </div>

      <div class="operator-status">
        <span>{operatorName()}</span>
        <strong>{state().toUpperCase()}</strong>
      </div>
      <p>{props.readyProviders}/{props.totalProviders} PROVIDERS READY</p>
      <span class="sr-only" aria-live="polite">
        {operatorName()} status {state()}. {props.readyProviders} of {props.totalProviders} providers ready.
      </span>
    </div>
  );
}
