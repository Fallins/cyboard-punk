import { emitTo, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { defaultSettings, loadSettings } from '../settings/settings';
import NyxSpeechBubble from './NyxSpeechBubble';
import NyxVrmRuntime from './NyxVrmRuntime';
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
      nyxCharacterScale: settings.nyxCharacterScale,
      nyxCharacterId: settings.nyxCharacterId,
    },
    nyxSpeechBubble: null,
  };
}

export default function NyxPresence() {
  const [payload, setPayload] = createSignal<NyxPresencePayload>(settingsPayload());
  const [rendererFailure, setRendererFailure] = createSignal<string | null>(null);

  onMount(() => {
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

  const close = () => {
    if (!isTauriDesktopRuntime()) return;
    void getCurrentWebviewWindow().close();
  };

  return (
    <main class="nyx-presence" aria-label={payload().settings.language === 'zh-TW' ? 'NYX 桌面角色' : 'NYX desktop character'}>
      <NyxVrmRuntime
        characterId={payload().settings.nyxCharacterId ?? defaultSettings.nyxCharacterId}
        language={payload().settings.language}
        state={payload().state}
        active
        reducedMotion={false}
        eventMotions={payload().settings.nyxEventMotions}
        randomActionsEnabled={payload().settings.nyxRandomActionsEnabled}
        randomActionIntervalSeconds={payload().settings.nyxRandomActionIntervalSeconds}
        characterScale={payload().settings.nyxCharacterScale}
        cameraLocked
        cameraResetRequest={0}
        motionPreview={null}
        motionPreviewRequest={0}
        onUnavailable={setRendererFailure}
      />
      <NyxSpeechBubble message={payload().nyxSpeechBubble} />
      <div class="nyx-presence__drag-region" aria-hidden="true" data-tauri-drag-region />
      <button
        type="button"
        class="nyx-presence__close"
        aria-label={payload().settings.language === 'zh-TW' ? '關閉桌面角色' : 'Close desktop character'}
        onClick={(event) => {
          event.stopPropagation();
          close();
        }}>
        ×
      </button>
      <Show when={rendererFailure()}>
        <span class="nyx-presence__status" role="status">
          {payload().settings.language === 'zh-TW' ? 'NYX 暫時不可用' : 'NYX unavailable'}
        </span>
      </Show>
    </main>
  );
}
