import { describe, expect, it } from 'vitest';
import { nextRandomNyxMotion } from './nyxVrmMotion';
import {
  NYX_DESKTOP_INTERACTION_MOTION_IDS,
  resolveNyxDesktopInteraction,
} from './nyxDesktopInteraction';

describe('NYX desktop interaction policy', () => {
  it('uses only the compact reviewed gesture pool and avoids an immediate repeat', () => {
    expect(NYX_DESKTOP_INTERACTION_MOTION_IDS).toEqual(['greeting', 'peaceSign', 'spin', 'showFullBody']);
    expect(nextRandomNyxMotion(NYX_DESKTOP_INTERACTION_MOTION_IDS, 'greeting', () => 0)).not.toBe('greeting');
  });

  it('prefers an expression-only acknowledgement when reduced motion is enabled', () => {
    expect(
      resolveNyxDesktopInteraction({ enabled: true, loaded: true, reducedMotion: true, actionActive: false }),
    ).toBe('expression');
    expect(
      resolveNyxDesktopInteraction({ enabled: true, loaded: true, reducedMotion: false, actionActive: false }),
    ).toBe('motion');
  });

  it('does not queue a click while disabled, loading, or a higher-priority action is active', () => {
    expect(
      resolveNyxDesktopInteraction({ enabled: false, loaded: true, reducedMotion: false, actionActive: false }),
    ).toBe('disabled');
    expect(
      resolveNyxDesktopInteraction({ enabled: true, loaded: false, reducedMotion: false, actionActive: false }),
    ).toBe('loading');
    expect(
      resolveNyxDesktopInteraction({ enabled: true, loaded: true, reducedMotion: false, actionActive: true }),
    ).toBe('busy');
  });
});
