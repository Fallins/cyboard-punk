import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import {
  experimentalVrmCharacterFor,
  nyxLocalizedLabel,
  type NyxRuntimeMotionId,
} from '../experiments/nyxVroidExperiment';
import { useI18n } from '../i18n/context';
import { defaultSettings, type NyxEventMotionMap } from '../settings/settings';
import type { NyxCameraView } from '../settings/nyxCameraView';
import NyxSpeechBubble, { type NyxSpeechBubbleMessage } from './NyxSpeechBubble';
import NyxVrmRuntime from './NyxVrmRuntime';
import { resolveOperatorRuntimeState, type OperatorRuntimeState, type OperatorTransientState } from './operatorRuntime';
import './operator.css';

interface OperatorStageProps {
  mode: 'female';
  readyProviders: number;
  totalProviders: number;
  activeAgents: number;
  transientState?: OperatorTransientState;
  nyxEventMotions?: NyxEventMotionMap;
  nyxRandomActionsEnabled?: boolean;
  nyxRandomActionIntervalSeconds?: number;
  nyxCharacterScale?: number;
  nyxStageInteractionLocked?: boolean;
  nyxCameraView?: NyxCameraView | null;
  nyxCharacterId?: string;
  nyxMotionPreview?: NyxRuntimeMotionId | null;
  nyxMotionPreviewRequest?: number;
  nyxSpeechBubble?: NyxSpeechBubbleMessage | null;
  setNyxStageInteractionLocked?: (locked: boolean) => void;
  setNyxCameraView?: (view: NyxCameraView) => void;
  openNyxPresence?: () => void;
}

export function operatorRendererMode(reducedMotion: boolean, failure?: string | null) {
  if (failure) return 'fallback';
  return reducedMotion ? 'vrm-webgl-paused' : 'vrm-webgl';
}

function NyxRuntimeUnavailable(props: { readonly characterId: string | undefined }) {
  const { language } = useI18n();
  const characterIdentity = () =>
    `${nyxLocalizedLabel(experimentalVrmCharacterFor(props.characterId ?? null), language())} // NYX`;
  return (
    <div class="operator-nyx-unavailable" role="status">
      <span>CY</span>
      <strong>
        {language() === 'zh-TW'
          ? `${characterIdentity()} 暫時不可用`
          : `${characterIdentity()} temporarily unavailable`}
      </strong>
      <small>{language() === 'zh-TW' ? 'Provider 監控仍持續運作。' : 'Provider monitoring remains active.'}</small>
    </div>
  );
}

function StageToolIcon(props: { name: 'lock' | 'unlock' | 'reset' | 'desktop' }) {
  if (props.name === 'lock' || props.name === 'unlock') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d={props.name === 'lock' ? 'M8 10V7a4 4 0 0 1 8 0v3' : 'M8 10V7a4 4 0 0 1 7.3-2.2'} />
        <path d="M12 14v2" />
      </svg>
    );
  }
  if (props.name === 'reset') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11a8 8 0 1 1 2.15 5.45" />
        <path d="M4 5v6h6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 17h8M12 10v4" />
    </svg>
  );
}

export default function OperatorStage(props: OperatorStageProps) {
  const { t, language } = useI18n();
  const [visible, setVisible] = createSignal(true);
  const [reducedMotion, setReducedMotion] = createSignal(false);
  const [rendererFailure, setRendererFailure] = createSignal<string | null>(null);
  const [cameraResetRequest, setCameraResetRequest] = createSignal(0);

  onMount(() => {
    const media =
      typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
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

  const state = (): OperatorRuntimeState =>
    resolveOperatorRuntimeState({
      readyProviders: props.readyProviders,
      totalProviders: props.totalProviders,
      activeAgents: props.activeAgents,
      transientState: props.transientState,
    });
  const stateLabel = () => {
    if (language() === 'en') return state().toUpperCase();
    switch (state()) {
      case 'idle':
        return t('stateIdle');
      case 'observing':
        return t('stateObserve');
      case 'processing':
        return t('stateProcess');
      case 'warning':
        return t('stateWarning');
      case 'success':
        return t('stateSuccess');
      case 'offline':
        return t('stateOffline');
    }
  };
  const stageInteractionLocked = () => props.nyxStageInteractionLocked ?? false;
  const rendererMode = () => operatorRendererMode(reducedMotion(), rendererFailure());
  const characterIdentity = () =>
    `${nyxLocalizedLabel(experimentalVrmCharacterFor(props.nyxCharacterId ?? null), language())} // NYX`;

  return (
    <section
      class={`operator-stage operator-stage--nyx operator-stage--${state()}`}
      data-paused={!visible() || reducedMotion()}
      data-renderer={rendererMode()}
      data-renderer-error={rendererFailure() ?? undefined}
      data-nyx-renderer-tier="production"
      data-nyx-motion-catalog="allowlisted"
      data-camera-locked={stageInteractionLocked()}
      aria-label={
        language() === 'zh-TW'
          ? `${characterIdentity()} CYBOARD Operator，${stateLabel()}`
          : `${characterIdentity()} CYBOARD operator, ${state()}`
      }>
      <div class="operator-halo operator-halo--outer" aria-hidden="true" />
      <div class="operator-halo operator-halo--inner" aria-hidden="true" />
      <div class="operator-scanline" aria-hidden="true" />

      <header class="operator-stage__header">
        <div class="operator-stage__identity">
          <span>{characterIdentity()}</span>
          <strong>{stateLabel()}</strong>
        </div>
        <div class="operator-stage-tools" role="group" aria-label={t('characterStageControls')}>
          <button
            type="button"
            class="operator-stage-tool"
            data-locked={stageInteractionLocked()}
            aria-label={stageInteractionLocked() ? t('unlockCharacterView') : t('lockCharacterView')}
            aria-pressed={stageInteractionLocked()}
            onClick={() => {
              const next = !stageInteractionLocked();
              props.setNyxStageInteractionLocked?.(next);
            }}>
            <StageToolIcon name={stageInteractionLocked() ? 'lock' : 'unlock'} />
          </button>
          <button
            type="button"
            class="operator-stage-tool"
            aria-label={t('resetCharacterView')}
            disabled={stageInteractionLocked()}
            onClick={() => setCameraResetRequest((current) => current + 1)}>
            <StageToolIcon name="reset" />
          </button>
          <Show when={props.openNyxPresence}>
            <button
              type="button"
              class="operator-stage-tool operator-stage-tool--desktop"
              aria-label={t('openDesktopCharacter')}
              onClick={() => props.openNyxPresence?.()}>
              <StageToolIcon name="desktop" />
            </button>
          </Show>
        </div>
        <div
          class="operator-stage__signals"
          aria-label={t('providersReady', { ready: props.readyProviders, total: props.totalProviders })}>
          <span>{t('providersReady', { ready: props.readyProviders, total: props.totalProviders })}</span>
          <Show when={props.activeAgents > 0}>
            <strong>
              {props.activeAgents} {t('activeAgents')}
            </strong>
          </Show>
        </div>
      </header>

      <div class="operator-stage__subject">
        <Show when={!rendererFailure()} fallback={<NyxRuntimeUnavailable characterId={props.nyxCharacterId} />}>
          <Show when={props.nyxCharacterId ?? defaultSettings.nyxCharacterId} keyed>
            {(characterId) => (
              <NyxVrmRuntime
                characterId={characterId}
                language={language()}
                state={state()}
                active={visible()}
                reducedMotion={reducedMotion()}
                eventMotions={props.nyxEventMotions ?? defaultSettings.nyxEventMotions}
                randomActionsEnabled={props.nyxRandomActionsEnabled ?? false}
                randomActionIntervalSeconds={props.nyxRandomActionIntervalSeconds ?? 60}
                characterScale={props.nyxCharacterScale ?? 1}
                cameraLocked={stageInteractionLocked()}
                cameraResetRequest={cameraResetRequest()}
                cameraView={props.nyxCameraView ?? null}
                onCameraViewChange={props.setNyxCameraView}
                motionPreview={props.nyxMotionPreview ?? null}
                motionPreviewRequest={props.nyxMotionPreviewRequest ?? 0}
                onUnavailable={setRendererFailure}
              />
            )}
          </Show>
        </Show>
        <NyxSpeechBubble message={props.nyxSpeechBubble} />
      </div>

      <Show when={rendererFailure()}>
        {(reason) => (
          <div class="operator-diagnostic" role="status">
            <strong>{language() === 'zh-TW' ? 'VRM 狀態' : 'VRM status'}</strong>
            <span>{language() === 'zh-TW' ? 'Renderer 不可用' : reason()}</span>
          </div>
        )}
      </Show>

      <span class="sr-only" aria-live="polite">
        {language() === 'zh-TW'
          ? `${characterIdentity()} 狀態 ${stateLabel()}。${props.readyProviders}/${props.totalProviders} Provider 就緒。`
          : `${characterIdentity()} status ${state()}. ${props.readyProviders} of ${props.totalProviders} providers ready.`}
      </span>
    </section>
  );
}
