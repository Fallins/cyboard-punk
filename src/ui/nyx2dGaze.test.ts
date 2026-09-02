import { describe, expect, it } from 'vitest';
import { nyx2DGazeBounds, nyx2DGazeOffsetAtTime } from './nyx2dGaze';

describe('NYX 2D gaze contract', () => {
  it('starts directed gaze from center and settles toward the provider', () => {
    expect(nyx2DGazeOffsetAtTime('observing', 'cursor', 0)).toEqual({ u: 0, v: 0 });
    const settled = nyx2DGazeOffsetAtTime('observing', 'cursor', 500);
    expect(settled.u).toBeGreaterThan(0.004);
    expect(settled.v).toBeGreaterThan(0);
  });

  it('maps dashboard provider positions consistently', () => {
    expect(nyx2DGazeOffsetAtTime('observing', 'codex', 500).u).toBeLessThan(0);
    expect(nyx2DGazeOffsetAtTime('observing', 'claude', 500).v).toBeLessThan(0);
    expect(nyx2DGazeOffsetAtTime('observing', 'cursor', 500).u).toBeGreaterThan(0);
  });

  it('stays frozen offline', () => {
    expect(nyx2DGazeOffsetAtTime('offline', 'cursor', 5000)).toEqual({ u: 0, v: 0 });
  });

  it('never exceeds the declared eye-motion bounds', () => {
    const bounds = nyx2DGazeBounds();
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
