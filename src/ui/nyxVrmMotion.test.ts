import { describe, expect, it } from 'vitest';
import {
  NYX_MOTION_REST_BLEND_MS,
  NYX_RANDOM_MOTION_END_HOLD_MS,
  shouldKeepNyxRestPoseDuringMotionLoad,
  nextRandomNyxMotion,
  restTransitionProgress,
  shouldQueueNyxEventMotion,
  shouldRunNyxRandomAction,
} from './nyxVrmMotion';

describe('NYX VRM motion policy', () => {
  it('queues an event motion only when the normalized runtime event changes', () => {
    expect(shouldQueueNyxEventMotion(null, 'warning', 'greeting', false)).toBe(true);
    expect(shouldQueueNyxEventMotion('warning', 'warning', 'greeting', false)).toBe(false);
    expect(shouldQueueNyxEventMotion('idle', 'warning', 'rest', false)).toBe(false);
    expect(shouldQueueNyxEventMotion('idle', 'warning', 'greeting', true)).toBe(false);
  });

  it('selects a published action without repeating the last random action when an alternative exists', () => {
    expect(nextRandomNyxMotion(['greeting', 'peaceSign'], 'greeting', () => 0)).toBe('peaceSign');
    expect(nextRandomNyxMotion(['greeting', 'peaceSign'], 'peaceSign', () => 0.99)).toBe('greeting');
    expect(nextRandomNyxMotion(['greeting'], 'greeting', () => 0.5)).toBe('greeting');
  });

  it('holds random playback while the renderer is hidden, reduced, disabled, or servicing an event', () => {
    expect(shouldRunNyxRandomAction({ enabled: true, visible: true, reducedMotion: false, eventActionActive: false })).toBe(true);
    expect(shouldRunNyxRandomAction({ enabled: false, visible: true, reducedMotion: false, eventActionActive: false })).toBe(false);
    expect(shouldRunNyxRandomAction({ enabled: true, visible: false, reducedMotion: false, eventActionActive: false })).toBe(false);
    expect(shouldRunNyxRandomAction({ enabled: true, visible: true, reducedMotion: true, eventActionActive: false })).toBe(false);
    expect(shouldRunNyxRandomAction({ enabled: true, visible: true, reducedMotion: false, eventActionActive: true })).toBe(false);
  });

  it('keeps the captured rest pose authoritative until an asynchronously loaded motion has a playable clip', () => {
    expect(shouldKeepNyxRestPoseDuringMotionLoad(false)).toBe(true);
    expect(shouldKeepNyxRestPoseDuringMotionLoad(true)).toBe(false);
  });

  it('gives random gestures a visible end hold before a bounded smooth return to rest', () => {
    expect(NYX_RANDOM_MOTION_END_HOLD_MS).toBe(900);
    expect(NYX_MOTION_REST_BLEND_MS).toBe(350);
    expect(restTransitionProgress(0)).toBe(0);
    expect(restTransitionProgress(175)).toBe(0.5);
    expect(restTransitionProgress(700)).toBe(1);
  });
});
