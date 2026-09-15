import { emitTo, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { defaultSettings, loadSettings } from '../settings/settings';
import { experimentalVrmCharacterFor, nyxLocalizedLabel } from '../experiments/nyxVroidExperiment';
import NyxSpeechBubble from './NyxSpeechBubble';
import NyxVrmRuntime from './NyxVrmRuntime';
import type { NyxDesktopInteractionOutcome } from './nyxDesktopInteraction';
import {
  isTauriDesktopRuntime,
  NYX_PRESENCE_READY_EVENT,
  NYX_PRESENCE_STATE_EVENT,
  type NyxPresencePayload,
} from './nyxPresenceWindow';
import './operator.css';
import './nyx-presence.css';

function settingsPayload(): NyxPresencePayload {
  const settings = loadSettings();
  return {
    state: 'idle',
    settings: {
      language: settings.language,
      nyxEventMotions: settings.nyxEventMotions,
      nyxRandomActionsEnabled: settings.nyxRandomActionsEnabled,
      nyxRandomActionIntervalSeconds: settings.nyxRandomActionIntervalSeconds,
      nyxDesktopInteractionsEnabled: settings.nyxDesktopInteractionsEnabled,
      nyxCharacterScale: settings.nyxCharacterScale,
      nyxCameraView: settings.nyxCameraView,
      nyxCharacterId: settings.nyxCharacterId,
    },
    nyxSpeechBubble: null,
  };
}

const NYX_PRESENCE_DEFAULT_SIZE = new LogicalSize(390, 680);
const NYX_PRESENCE_MIN_WIDTH = 220;
const NYX_PRESENCE_MAX_WIDTH = 620;
const NYX_PRESENCE_ASPECT_RATIO = 680 / 390;
const NYX_PRESENCE_SIZE_STEP = 1.15;

export default function NyxPresence() {
  const [payload, setPayload] = createSignal<NyxPresencePayload>(settingsPayload());
  const [rendererFailure, setRendererFailure] = createSignal<string | null>(null);
  const [reducedMotion, setReducedMotion] = createSignal(false);
  const [desktopInteractionRequest, setDesktopInteractionRequest] = createSignal(0);
  const [interactionCoolingDown, setInteractionCoolingDown] = createSignal(false);
  let interactionCooldownTimer: number | null = null;
  let windowSizeTask = Promise.resolve();

  const clearInteractionCooldown = () => {
    if (interactionCooldownTimer !== null) window.clearTimeout(interactionCooldownTimer);
    interactionCooldownTimer = null;
    setInteractionCoolingDown(false);
  };

  const handleDesktopInteractionResult = (outcome: NyxDesktopInteractionOutcome) => {
    if (outcome !== 'motion' && outcome !== 'expression') return;
    clearInteractionCooldown();
    setInteractionCoolingDown(true);
    interactionCooldownTimer = window.setTimeout(clearInteractionCooldown, 2_500);
  };

  const requestDesktopInteraction = () => {
    if (!payload().settings.nyxDesktopInteractionsEnabled || interactionCoolingDown()) return;
    setDesktopInteractionRequest((request) => request + 1);
  };

  onCleanup(clearInteractionCooldown);

  onMount(() => {
    const media =
      typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const syncReducedMotion = () => setReducedMotion(media?.matches ?? false);
    syncReducedMotion();
    media?.addEventListener('change', syncReducedMotion);
    onCleanup(() => media?.removeEventListener('change', syncReducedMotion));

    if (!isTauriDesktopRuntime()) return;
    let unlisten: UnlistenFn | undefined;
    void listen<NyxPresencePayload>(NYX_PRESENCE_STATE_EVENT, (event) => {
      setPayload(event.payload);
      setRendererFailure(null);
    }).then((nextUnlisten) => {
      unlisten = nextUnlisten;
      return emitTo('main', NYX_PRESENCE_READY_EVENT);
    });
    onCleanup(() => unlisten?.());
  });

  const hide = () => {
    if (!isTauriDesktopRuntime()) return;
    void getCurrentWebviewWindow().hide();
  };
  const characterIdentity = () =>
    `${nyxLocalizedLabel(experimentalVrmCharacterFor(payload().settings.nyxCharacterId), payload().settings.language)} // NYX`;

  const startDragging = (event: PointerEvent) => {
    if (!isTauriDesktopRuntime() || event.button > 0) return;
    event.preventDefault();
    void getCurrentWebviewWindow().startDragging();
  };

  const queueWindowSizeTask = (task: () => Promise<void>) => {
    windowSizeTask = windowSizeTask.then(task).catch(() => undefined);
  };

  const resetDesktopSize = () => {
    if (!isTauriDesktopRuntime()) return;
    queueWindowSizeTask(async () => {
      await getCurrentWebviewWindow().setSize(NYX_PRESENCE_DEFAULT_SIZE);
    });
  };

  const scaleDesktopSize = (direction: 'shrink' | 'enlarge') => {
    if (!isTauriDesktopRuntime()) return;
    queueWindowSizeTask(async () => {
      const currentWindow = getCurrentWebviewWindow();
      const [physicalSize, scaleFactor] = await Promise.all([currentWindow.innerSize(), currentWindow.scaleFactor()]);
      const currentLogicalWidth = physicalSize.width / scaleFactor;
      const factor = direction === 'enlarge' ? NYX_PRESENCE_SIZE_STEP : 1 / NYX_PRESENCE_SIZE_STEP;
      const width = Math.round(
        Math.min(NYX_PRESENCE_MAX_WIDTH, Math.max(NYX_PRESENCE_MIN_WIDTH, currentLogicalWidth * factor)),
      );
      const height = Math.round(width * NYX_PRESENCE_ASPECT_RATIO);
      await currentWindow.setSize(new LogicalSize(width, height));
    });
  };

  return (
    <main
      class="nyx-presence"
      aria-label={
        payload().settings.language === 'zh-TW'
          ? `${characterIdentity()} 桌面角色`
          : `${characterIdentity()} desktop character`
      }>
      <NyxVrmRuntime
        characterId={payload().settings.nyxCharacterId ?? defaultSettings.nyxCharacterId}
        language={payload().settings.language}
        state={payload().state}
        active
        reducedMotion={reducedMotion()}
        eventMotions={payload().settings.nyxEventMotions}
        randomActionsEnabled={payload().settings.nyxRandomActionsEnabled}
        randomActionIntervalSeconds={payload().settings.nyxRandomActionIntervalSeconds}
        desktopInteractionsEnabled={payload().settings.nyxDesktopInteractionsEnabled}
        desktopInteractionRequest={desktopInteractionRequest()}
        characterScale={payload().settings.nyxCharacterScale}
        cameraLocked
        cameraResetRequest={0}
        cameraView={payload().settings.nyxCameraView}
        motionPreview={null}
        motionPreviewRequest={0}
        onDesktopInteractionResult={handleDesktopInteractionResult}
        onUnavailable={setRendererFailure}
      />
      <NyxSpeechBubble message={payload().nyxSpeechBubble} />
      <button
        type="button"
        class="nyx-presence__interaction"
        aria-label={payload().settings.language === 'zh-TW' ? '與桌面角色互動' : 'Interact with desktop character'}
        disabled={!payload().settings.nyxDesktopInteractionsEnabled || interactionCoolingDown()}
        onClick={requestDesktopInteraction}
      />
      <button
        type="button"
        class="nyx-presence__drag-handle"
        aria-label={payload().settings.language === 'zh-TW' ? '拖曳桌面角色' : 'Move desktop character'}
        onPointerDown={startDragging}>
        <svg viewBox="0 0 20 8" aria-hidden="true">
          <circle cx="4" cy="2" r="1" />
          <circle cx="10" cy="2" r="1" />
          <circle cx="16" cy="2" r="1" />
          <circle cx="4" cy="6" r="1" />
          <circle cx="10" cy="6" r="1" />
          <circle cx="16" cy="6" r="1" />
        </svg>
      </button>
      <button
        type="button"
        class="nyx-presence__close"
        aria-label={payload().settings.language === 'zh-TW' ? '關閉桌面角色' : 'Close desktop character'}
        onClick={(event) => {
          event.stopPropagation();
          hide();
        }}>
        ×
      </button>
      <div
        class="nyx-presence__size-controls"
        role="group"
        aria-label={payload().settings.language === 'zh-TW' ? '桌面角色視窗大小' : 'Desktop character window size'}>
        <button
          type="button"
          aria-label={payload().settings.language === 'zh-TW' ? '縮小桌面角色' : 'Shrink desktop character'}
          onClick={() => scaleDesktopSize('shrink')}>
          −
        </button>
        <button
          type="button"
          aria-label={payload().settings.language === 'zh-TW' ? '恢復桌面角色大小' : 'Reset desktop character size'}
          onClick={resetDesktopSize}>
          1:1
        </button>
        <button
          type="button"
          aria-label={payload().settings.language === 'zh-TW' ? '放大桌面角色' : 'Enlarge desktop character'}
          onClick={() => scaleDesktopSize('enlarge')}>
          +
        </button>
      </div>
      <Show when={rendererFailure()}>
        <span class="nyx-presence__status" role="status">
          {payload().settings.language === 'zh-TW'
            ? `${characterIdentity()} 暫時不可用`
            : `${characterIdentity()} unavailable`}
        </span>
      </Show>
    </main>
  );
}
