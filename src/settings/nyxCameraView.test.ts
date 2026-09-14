import { describe, expect, it } from 'vitest';
import {
  calculateNyxCameraFitDistance,
  NYX_CAMERA_VIEW_VERSION,
  nyxCameraViewsEqual,
  sanitizeNyxCameraView,
} from './nyxCameraView';

describe('NYX camera view settings', () => {
  it('copies a finite camera position and target inside the runtime orbit bounds', () => {
    const source = {
      version: NYX_CAMERA_VIEW_VERSION,
      position: [1.25, 2.5, 4.25],
      target: [0, 0.95, 0],
    };

    const sanitized = sanitizeNyxCameraView(source);

    expect(sanitized).toEqual(source);
    expect(sanitized).not.toBe(source);
  });

  it('rejects malformed, non-finite, and out-of-range camera views', () => {
    expect(sanitizeNyxCameraView(null)).toBeNull();
    expect(sanitizeNyxCameraView({ position: [0, 1, 4], target: [0, 1, 0] })).toBeNull();
    expect(
      sanitizeNyxCameraView({ version: NYX_CAMERA_VIEW_VERSION, position: [0, 1, Number.NaN], target: [0, 1, 0] }),
    ).toBeNull();
    expect(
      sanitizeNyxCameraView({ version: NYX_CAMERA_VIEW_VERSION, position: [0, 1, 40], target: [0, 1, 0] }),
    ).toBeNull();
    expect(
      sanitizeNyxCameraView({ version: NYX_CAMERA_VIEW_VERSION, position: [0, 1, 1.1], target: [0, 1, 0] }),
    ).toBeNull();
  });

  it('ignores sub-pixel camera noise when deciding whether to persist a new view', () => {
    const current = sanitizeNyxCameraView({
      version: NYX_CAMERA_VIEW_VERSION,
      position: [0, 1.5, 4.5],
      target: [0, 0.9, 0],
    });
    const noisy = sanitizeNyxCameraView({
      version: NYX_CAMERA_VIEW_VERSION,
      position: [0.00001, 1.50001, 4.5],
      target: [0, 0.9, 0],
    });
    const changed = sanitizeNyxCameraView({
      version: NYX_CAMERA_VIEW_VERSION,
      position: [0.2, 1.5, 4.5],
      target: [0, 0.9, 0],
    });

    expect(nyxCameraViewsEqual(current, noisy)).toBe(true);
    expect(nyxCameraViewsEqual(current, changed)).toBe(false);
  });

  it('fits the default camera to the full character height with breathing room', () => {
    expect(calculateNyxCameraFitDistance(2.75, 31, 1.12)).toBeCloseTo(5.56, 1);
    expect(calculateNyxCameraFitDistance(2.75, 31, 1.12)).toBeGreaterThan(4.55);
  });
});
