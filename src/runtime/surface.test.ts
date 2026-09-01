import { describe, expect, it } from 'vitest';
import { resolveAppSurface } from './surface';

describe('resolveAppSurface', () => {
  it('falls back to the full dashboard in a normal browser', () => {
    expect(resolveAppSurface(false)).toBe('main');
  });

  it('uses the compact surface only for the Tauri compact window', () => {
    expect(resolveAppSurface(true, 'compact')).toBe('compact');
    expect(resolveAppSurface(true, 'main')).toBe('main');
  });
});
