import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import type { IntelligenceTone } from '../domain/statusIntelligence';
import { useI18n } from '../i18n/context';
import type { OperatorMode } from '../settings/settings';
import {
  resetNyx2DRuntimeAttentionTarget,
  resolveNyx2DAttentionTarget,
  setNyx2DRuntimeAttentionTarget,
  type Nyx2DAttentionTarget,
} from './nyx2dAttention';
import { nyx2DStateLifecycleBand } from './nyx2dContinuity';
import Nyx2DManagedRuntime from './Nyx2DManagedRuntime';
import Nyx2DPerformanceMonitor from './Nyx2DPerformanceMonitor';
import Nyx2DPrototype from './Nyx2DPrototype';
import { resolveNyx2DRuntimeProfile } from './nyx2dProfile';
import {
  resetNyx2DRuntimeTuning,
  resolveNyx2DMotionTuning,
  setNyx2DRuntimeTuning,
  type Nyx2DMotionTuning,
} from './nyx2dTuning';
import OperatorWebGL from './OperatorWebGL';
import {
  operatorPosterPath,
  resolveOperatorRuntimeState,
  type OperatorProviderPanel,
  type OperatorRuntimeState,
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
  stateOverride?: OperatorRuntimeState | null;
  attentionOverride?: Nyx2DAttentionTarget | null;
  motionTuning?: Partial<Nyx2DMotionTuning> | null;
  briefHeadline?: string;
  briefTone?: IntelligenceTone;
}

type OperatorRendererKind = 'nyx-2d' | 'axon-webgl';

export function operatorRendererMode(
  reducedMotion: boolean,
  failure?: string | null,
  renderer: OperatorRendererKind = 'nyx-2d',
) {
  if (failure) return 'fallback';
  if (renderer === 'nyx-2d') return reducedMotion ? '2d-webgl-paused' : '2d-webgl';
  return reducedMotion ? 'webgl-paused' : 'webgl';
}

function ProceduralFallback(props: { mode: 'female' | 'male' }) {
  const { language } = useI18n();
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
      <span class="sr-only">
        {language() === 'zh-TW' ? `${props.mode === 'female' ? '女性' : '男性'}備援 Operator` : `${props.mode} fallback operator`}
      </span>
    </div>
  );
}

function StaticOperatorFallback() {
  const [posterUnavailable, setPosterUnavailable] = createSignal(false);
  return (
    <Show when={!posterUnavailable()} fallback={<ProceduralFallback mode="male" />}>
      <img
        class="operator-poster"
        src={operatorPosterPath('male')}
        alt=""
        aria-hidden="true"
        onError={() => setPosterUnavailable(true)}
      />
    </Show>
  );
}

function Nyx2DFallback() {
  const [posterUnavailable, setPosterUnavailable] = createSignal(false);
  return (
    <Show when={!posterUnavailable()} fallback={<ProceduralFallback mode="female" />}>
      <Nyx2DPrototype onUnavailable={() => setPosterUnavailable(true)} />
    </Show>
  );
}

function ProviderHudPanel(props: { panel: OperatorProviderPanel }) {
  const { t, language } = useI18n();
  const stateLabel = () => {
    if (language() === 'en') return props.panel.state.toUpperCase();
    switch (props.panel.state) {
      case 'ready': return '就緒';
      case 'active': return '執行中';
      case 'warning': return '警告';
      case 'offline': return '離線';
    }
  };
  return (
    <div
      class={`operator-provider-panel operator-provider-panel--${props.panel.state}`}
      data-provider={props.panel.provider}>
      <span class="operator-provider-panel__name">{props.panel.label}</span>
      <Show when={props.panel.remainingPercent !== undefined} fallback={<strong>{t('stateOffline')}</strong>}>
        <strong>{Math.round(props.panel.remainingPercent!)}% {t('left')}</strong>
      </Show>
      <small>{stateLabel()}</small>
    </div>
  );
}

export default function OperatorStage(props: OperatorStageProps) {
  const { t, language } = useI18n();
  const [visible, setVisible] = createSignal(true);
  const [reducedMotion, setReducedMotion] = createSignal(false);
  const [rendererFailure, setRendererFailure] = createSignal<string | null>(null);
  const nyx2DProfile = resolveNyx2DRuntimeProfile(import.meta.env.VITE_NYX_2D_PROFILE);
  const motionTuning = () => resolveNyx2DMotionTuning(props.motionTuning);
  const attentionTarget = () => props.attentionOverride ?? resolveNyx2DAttentionTarget(props.providers);

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
      resetNyx2DRuntimeTuning();
      resetNyx2DRuntimeAttentionTarget();
    });
  });

  createEffect(() => {
    document.documentElement.dataset.operatorMotion = visible() && !reducedMotion() ? 'active' : 'paused';
  });

  createEffect(() => {
    if (props.mode === 'female') setNyx2DRuntimeTuning(motionTuning());
    else resetNyx2DRuntimeTuning();
  });

  createEffect(() => {
    if (props.mode === 'female') setNyx2DRuntimeAttentionTarget(attentionTarget());
    else resetNyx2DRuntimeAttentionTarget();
  });

  const state = () => props.stateOverride ?? resolveOperatorRuntimeState({
    readyProviders: props.readyProviders,
    totalProviders: props.totalProviders,
    activeAgents: props.activeAgents,
    transientState: props.transientState,
  });
  const stateLabel = () => {
    if (language() === 'en') return state().toUpperCase();
    switch (state()) {
      case 'idle': return t('stateIdle');
      case 'observing': return t('stateObserve');
      case 'processing': return t('stateProcess');
      case 'warning': return t('stateWarning');
      case 'success': return t('stateSuccess');
      case 'offline': return t('stateOffline');
    }
  };

  const nyx2DStateRef: { current: OperatorRuntimeState } = { current: state() };
  const nyx2DLifecycleBand = createMemo(() => nyx2DStateLifecycleBand(state()));
  createEffect(() => {
    nyx2DStateRef.current = state();
  });
  const nyx2DStateForRenderer = () => {
    nyx2DLifecycleBand();
    return nyx2DStateRef.current;
  };

  const operatorName = () => props.mode === 'female' ? 'NYX' : 'AXON';
  const usingNyx2D = () => props.mode === 'female';
  const rendererKind = (): OperatorRendererKind => usingNyx2D() ? 'nyx-2d' : 'axon-webgl';
  const rendererMode = () => operatorRendererMode(reducedMotion(), rendererFailure(), rendererKind());

  return (
    <div
      class={`operator-stage operator-stage--${props.mode} operator-stage--${state()}`}
      data-paused={!visible() || reducedMotion()}
      data-renderer={rendererMode()}
      data-renderer-error={rendererFailure() ?? undefined}
      data-attention-target={usingNyx2D() ? attentionTarget() : undefined}
      data-attention-override={usingNyx2D() ? props.attentionOverride ?? undefined : undefined}
      data-nyx-2d-profile={usingNyx2D() ? nyx2DProfile : undefined}
      data-nyx-renderer-tier={usingNyx2D() ? 'production' : undefined}
      data-nyx-breath-scale={usingNyx2D() ? motionTuning().breath : undefined}
      data-nyx-arms-scale={usingNyx2D() ? motionTuning().arms : undefined}
      data-nyx-torso-scale={usingNyx2D() ? motionTuning().torso : undefined}
      data-nyx-head-scale={usingNyx2D() ? motionTuning().head : undefined}
      data-state-override={props.stateOverride ?? undefined}
      aria-label={language() === 'zh-TW'
        ? `${operatorName()} CYBOARD Operator，${stateLabel()}`
        : `${operatorName()} CYBOARD operator, ${state()}`}>
      <div class="operator-halo operator-halo--outer" />
      <div class="operator-halo operator-halo--inner" />
      <div class="operator-scanline" />

      <Show when={!rendererFailure()} fallback={usingNyx2D() ? <Nyx2DFallback /> : <StaticOperatorFallback />}>
        <Show
          when={usingNyx2D()}
          fallback={
            <OperatorWebGL
              mode="male"
              state={state()}
              onUnavailable={() => setRendererFailure('AXON WebGL renderer unavailable')}
            />
          }>
          <Nyx2DManagedRuntime
            state={nyx2DStateForRenderer()}
            active={visible()}
            reducedMotion={reducedMotion()}
            onUnavailable={(reason) => setRendererFailure(reason)}
          />
          <Nyx2DPerformanceMonitor profile={nyx2DProfile} />
        </Show>
      </Show>

      <Show when={rendererFailure()}>
        {(reason) => (
          <div class="operator-diagnostic" role="status">
            <strong>{usingNyx2D() ? `2D ${t('fallback')}` : `AXON ${t('fallback')}`}</strong>
            <span>{language() === 'zh-TW' ? 'Renderer 不可用' : reason()}</span>
          </div>
        )}
      </Show>

      <div class="operator-provider-panels" aria-hidden="true">
        <For each={props.providers}>{(panel) => <ProviderHudPanel panel={panel} />}</For>
      </div>

      <div class="operator-status">
        <span>{operatorName()}</span>
        <strong>{stateLabel()}</strong>
      </div>
      <Show when={props.briefHeadline}>
        <div class="operator-intelligence" data-tone={props.briefTone ?? 'nominal'}>
          <span>{t('brief')}</span>
          <strong>{props.briefHeadline}</strong>
        </div>
      </Show>
      <p>{t('providersReady', { ready: props.readyProviders, total: props.totalProviders })}</p>
      <span class="sr-only" aria-live="polite">
        {language() === 'zh-TW'
          ? `${operatorName()} 狀態 ${stateLabel()}。${props.readyProviders}/${props.totalProviders} Provider 就緒。${props.briefHeadline ? ` 系統摘要：${props.briefHeadline}。` : ''}`
          : `${operatorName()} status ${state()}. ${props.readyProviders} of ${props.totalProviders} providers ready.${props.briefHeadline ? ` System brief: ${props.briefHeadline}.` : ''}`}
      </span>
    </div>
  );
}
