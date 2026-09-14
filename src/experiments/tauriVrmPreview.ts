import { invoke } from '@tauri-apps/api/core';

const TAURI_INTERNALS = '__TAURI_INTERNALS__';

/**
 * The local Tauri route remains useful for catalog intake and visual debugging.
 * It cannot alter the persisted production mapping or load arbitrary assets.
 */
export function canOpenExperimentalVrmPreview(
  windowLike: object = window,
  isDevelopment: boolean = import.meta.env.DEV,
): boolean {
  return isDevelopment && TAURI_INTERNALS in windowLike;
}

export async function openExperimentalVrmPreview(
  motion?: string,
  language?: 'en' | 'zh-TW',
  character?: string,
): Promise<void> {
  await invoke('open_vrm_experiment', {
    motion: motion ?? null,
    language: language ?? null,
    character: character ?? null,
  });
}
