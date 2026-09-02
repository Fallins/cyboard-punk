import { describe, expect, it } from 'vitest';
import { nyx2DStateLifecycleBand } from './nyx2dContinuity';

describe('NYX 2D lifecycle continuity', () => {
  it('keeps all visible runtime states in one continuous animation band', () => {
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success'] as const) {
      expect(nyx2DStateLifecycleBand(state)).toBe('live');
    }
  });

  it('treats offline as a real lifecycle boundary', () => {
    expect(nyx2DStateLifecycleBand('offline')).toBe('offline');
  });
});
