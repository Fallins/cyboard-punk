import { describe, expect, it } from 'vitest';
import { canOpenExperimentalVrmPreview } from './tauriVrmPreview';

describe('Tauri VRM preview launcher', () => {
  it('is unavailable outside a development build even if Tauri internals are present', () => {
    const tauriWindow = { __TAURI_INTERNALS__: {} };
    expect(canOpenExperimentalVrmPreview(tauriWindow, false)).toBe(false);
  });

  it('requires both a local development build and the Tauri runtime', () => {
    const tauriWindow = { __TAURI_INTERNALS__: {} };
    expect(canOpenExperimentalVrmPreview(tauriWindow, true)).toBe(true);
    expect(canOpenExperimentalVrmPreview({}, true)).toBe(false);
  });
});
