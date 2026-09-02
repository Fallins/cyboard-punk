import { describe, expect, it } from 'vitest';
import {
  nyx2DGazeBounds,
  nyx2DGazeEnabled,
  nyx2DGazeOffsetAtTime,
  nyx2DShouldAnimateGaze,
} from './nyx2dGaze';

describe('NYX 2D graduated gaze contract', () => {
  it('is stable by default with an explicit rollback switch', () => {
    expect(nyx2DGazeEnabled(undefined)).toBe(true);
    expect(nyx2DGazeEnabled('')).toBe(true);
    expect(nyx2DGazeEnabled('1')).toBe(true);
    expect(nyx2DGazeEnabled('true')).toBe(true);
    expect(nyx2DGazeEnabled('0')).toBe(false);
    expect(nyx2DGazeEnabled('false')).toBe(false);
    expect(nyx2DGazeEnabled('off')).toBe(false);
  });

  it('honors lifecycle and reduced motion', () => {
    expect(nyx2DShouldAnimateGaze('idle', true, false, true)).toBe(true);
    expect(nyx2DShouldAnimateGaze('idle', false, false, true)).toBe(false);
    expect(nyx2DShouldAnimateGaze('idle', true, true, true)).toBe(false);
    expect(nyx2DShouldAnimateGaze('idle', true, false, false)).toBe(false);
    expect(nyx2DShouldAnimateGaze('offline', true, false, true)).toBe(false);
  });

  it('keeps center attention exactly neutral instead of perpetually scanning', () => {
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success'] as const) {
      for (let time = 0; time <= 30000; time += 137) {
        expect(nyx2DGazeOffsetAtTime(state, 'center', time)).toEqual({ u: 0, v: 0 });
      }
    }
  });

  it('starts directed gaze from center and settles calmly toward the provider', () => {
    expect(nyx2DGazeOffsetAtTime('observing', 'cursor', 0)).toEqual({ u: 0, v: 0 });
    const early = nyx2DGazeOffsetAtTime('observing', 'cursor', 120);
    const settled = nyx2DGazeOffsetAtTime('observing', 'cursor', 700);
    expect(early.u).toBeGreaterThan(0);
    expect(settled.u).toBeGreaterThan(early.u);
    expect(settled.u).toBeLessThan(0.0032);
    expect(settled.v).toBeGreaterThan(0);
  });

  it('maps dashboard provider positions consistently', () => {
    expect(nyx2DGazeOffsetAtTime('observing', 'codex', 700).u).toBeLessThan(0);
    expect(nyx2DGazeOffsetAtTime('observing', 'claude', 700).v).toBeLessThan(0);
    expect(nyx2DGazeOffsetAtTime('observing', 'cursor', 700).u).toBeGreaterThan(0);
  });

  it('stays frozen offline', () => {
    expect(nyx2DGazeOffsetAtTime('offline', 'cursor', 5000)).toEqual({ u: 0, v: 0 });
  });

  it('never exceeds the reduced eye-motion bounds', () => {
    const bounds = nyx2DGazeBounds();
    expect(bounds.u).toBeLessThanOrEqual(0.0036);
    expect(bounds.v).toBeLessThanOrEqual(0.0016);

    for (const state of ['idle', 'observing', 'processing', 'warning', 'success', 'offline'] as const) {
      for (const target of ['center', 'codex', 'claude', 'cursor'] as const) {
        for (let time = 0; time <= 20000; time += 137) {
          const offset = nyx2DGazeOffsetAtTime(state, target, time);
          expect(Math.abs(offset.u)).toBeLessThanOrEqual(bounds.u + 1e-8);
          expect(Math.abs(offset.v)).toBeLessThanOrEqual(bounds.v + 1e-8);
        }
      }
    }
  });
});
