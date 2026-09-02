import { describe, expect, it } from 'vitest';
import { nyx2DStateStance, nyx2DStateStanceTransform } from './nyx2dStatePose';

describe('NYX 2D sustained state stance', () => {
  it('keeps idle and offline neutral', () => {
    expect(nyx2DStateStance('idle')).toEqual({
      translateXPx: 0,
      translateYPx: 0,
      rotationDeg: 0,
      scaleX: 1,
      scaleY: 1,
    });
    expect(nyx2DStateStance('offline')).toEqual(nyx2DStateStance('idle'));
  });

  it('gives each live semantic state a distinct held stance', () => {
    const transforms = ['observing', 'processing', 'warning', 'success'].map((state) =>
      nyx2DStateStanceTransform(state as 'observing' | 'processing' | 'warning' | 'success'),
    );
    expect(new Set(transforms).size).toBe(4);
    expect(transforms.every((value) => value !== nyx2DStateStanceTransform('idle'))).toBe(true);
  });

  it('scales held stance around neutral for visual calibration', () => {
    expect(nyx2DStateStanceTransform('success', 0)).toContain('translate3d(0px, 0px, 0)');
    expect(nyx2DStateStanceTransform('success', 3)).toContain('-7.2px');
    expect(nyx2DStateStanceTransform('observing', 3)).toContain('-5.4px');
  });

  it('keeps the 1x production stance inside the whole-operator safety envelope', () => {
    for (const state of ['idle', 'observing', 'processing', 'warning', 'success', 'offline'] as const) {
      const stance = nyx2DStateStance(state);
      expect(Math.abs(stance.translateXPx)).toBeLessThanOrEqual(3);
      expect(Math.abs(stance.translateYPx)).toBeLessThanOrEqual(3);
      expect(Math.abs(stance.rotationDeg)).toBeLessThanOrEqual(0.3);
      expect(stance.scaleX).toBeGreaterThanOrEqual(0.992);
      expect(stance.scaleX).toBeLessThanOrEqual(1.008);
      expect(stance.scaleY).toBeGreaterThanOrEqual(0.992);
      expect(stance.scaleY).toBeLessThanOrEqual(1.008);
    }
  });
});
