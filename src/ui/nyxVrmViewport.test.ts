import { createComputed, createRoot, createSignal } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { applyNyxModelScale, publishNyxCameraView } from './nyxVrmViewport';

describe('NYX VRM viewport ownership', () => {
  it('scales and ground-anchors only the model transform', () => {
    const model = {
      scale: { setScalar: vi.fn() },
      position: { y: 0 },
    };

    expect(applyNyxModelScale(model, -0.2, 1.5, 1.2)).toBeCloseTo(1.8);
    expect(model.scale.setScalar).toHaveBeenCalledWith(expect.closeTo(1.8));
    expect(model.position.y).toBeCloseTo(0.36);
  });

  it('does not subscribe a runtime effect to settings read by the camera callback', () => {
    createRoot((dispose) => {
      const [runtimeTrigger, setRuntimeTrigger] = createSignal(0);
      const [settingsVersion, setSettingsVersion] = createSignal(0);
      let runtimeEffectRuns = 0;

      createComputed(() => {
        runtimeTrigger();
        runtimeEffectRuns += 1;
        publishNyxCameraView(() => settingsVersion(), {
          version: 1,
          position: [0, 1, 4],
          target: [0, 1, 0],
        });
      });

      expect(runtimeEffectRuns).toBe(1);
      setSettingsVersion(1);
      expect(runtimeEffectRuns).toBe(1);
      setRuntimeTrigger(1);
      expect(runtimeEffectRuns).toBe(2);
      dispose();
    });
  });
});
