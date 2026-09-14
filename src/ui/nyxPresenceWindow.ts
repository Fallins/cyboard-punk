import { emitTo } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import type { NyxRuntimeEvent } from '../experiments/nyxVroidExperiment';
import type { AppSettings } from '../settings/settings';
import type { NyxSpeechBubbleMessage } from './NyxSpeechBubble';

export const NYX_PRESENCE_WINDOW_LABEL = 'nyx-presence';
export const NYX_PRESENCE_READY_EVENT = 'nyx-presence-ready';
export const NYX_PRESENCE_STATE_EVENT = 'nyx-presence-state';

export interface NyxPresencePayload {
  readonly state: NyxRuntimeEvent;
  readonly nyxSpeechBubble?: NyxSpeechBubbleMessage | null;
  readonly settings: Pick<
    AppSettings,
    | 'language'
    | 'nyxEventMotions'
    | 'nyxRandomActionsEnabled'
    | 'nyxRandomActionIntervalSeconds'
    | 'nyxCharacterScale'
    | 'nyxCharacterId'
  >;
}

export function isTauriDesktopRuntime(windowLike: object = window): boolean {
  return '__TAURI_INTERNALS__' in windowLike;
}

export async function openNyxPresence(): Promise<void> {
  await invoke('open_nyx_presence');
}

export async function emitNyxPresenceState(payload: NyxPresencePayload): Promise<void> {
  await emitTo(NYX_PRESENCE_WINDOW_LABEL, NYX_PRESENCE_STATE_EVENT, payload);
}
