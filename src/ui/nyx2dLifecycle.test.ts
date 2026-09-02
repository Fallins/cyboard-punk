import { describe, expect, it } from 'vitest';
import { nyx2DResumeRestartsMotionClock, resolveNyx2DLifecycle } from './nyx2dLifecycle';

const base = {
  ready: true,
  active: true,
  intersecting: true,
  documentVisible: true,
  reducedMotion: false,
  state: 'idle' as const,
  hasAnimatedChannels: true,
};

describe('NYX 2D finalized lifecycle', () => {
  it('runs RAF only for a visible live renderer with animated channels', () => {
    expect(resolveNyx2DLifecycle(base)).toEqual({
      mode: 'animated',
      reason: 'active',
      shouldRender: true,
      shouldRunRaf: true,
    });
  });

  it('suspends completely while hidden, inactive, or offscreen', () => {
    expect(resolveNyx2DLifecycle({ ...base, active: false }).mode).toBe('suspended');
    expect(resolveNyx2DLifecycle({ ...base, intersecting: false }).reason).toBe('offscreen');
    expect(resolveNyx2DLifecycle({ ...base, documentVisible: false }).reason).toBe('document-hidden');
  });

  it('renders one static frame for reduced motion and offline', () => {
    const reduced = resolveNyx2DLifecycle({ ...base, reducedMotion: true });
    const offline = resolveNyx2DLifecycle({ ...base, state: 'offline' });

    expect(reduced).toMatchObject({ mode: 'static', shouldRender: true, shouldRunRaf: false });
    expect(offline).toMatchObject({ mode: 'static', reason: 'offline', shouldRunRaf: false });
  });

  it('does not keep a RAF alive when every animated channel is disabled', () => {
    expect(resolveNyx2DLifecycle({ ...base, hasAnimatedChannels: false })).toEqual({
      mode: 'static',
      reason: 'no-animated-channels',
      shouldRender: true,
      shouldRunRaf: false,
    });
  });

  it('does not render before assets are ready', () => {
    expect(resolveNyx2DLifecycle({ ...base, ready: false })).toEqual({
      mode: 'loading',
      reason: 'loading',
      shouldRender: false,
      shouldRunRaf: false,
    });
  });

  it('restarts the local motion clock only when resuming into animation', () => {
    expect(nyx2DResumeRestartsMotionClock('suspended', 'animated')).toBe(true);
    expect(nyx2DResumeRestartsMotionClock('static', 'animated')).toBe(true);
    expect(nyx2DResumeRestartsMotionClock('animated', 'animated')).toBe(false);
    expect(nyx2DResumeRestartsMotionClock('animated', 'static')).toBe(false);
  });
});
