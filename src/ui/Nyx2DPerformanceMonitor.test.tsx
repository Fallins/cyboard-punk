import { cleanup, render, waitFor } from '@solidjs/testing-library';
import { Show, createSignal } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';
import Nyx2DPerformanceMonitor from './Nyx2DPerformanceMonitor';

afterEach(cleanup);

function MetricsHost(props: { id: string; drawCalls: number }) {
  return (
    <div
      class="nyx-2d-webgl"
      data-testid={props.id}
      data-draw-calls={String(props.drawCalls)}
      data-triangles="100"
      data-geometries="2"
      data-textures="2"
      data-render-ms="1"
    />
  );
}

describe('Nyx2DPerformanceMonitor renderer replacement', () => {
  it('reattaches when an experimental renderer is replaced by production fallback', async () => {
    let setFallback!: (value: boolean) => void;

    function Harness() {
      const [fallback, updateFallback] = createSignal(false);
      setFallback = updateFallback;
      return (
        <div class="operator-stage" data-nyx2d-lifecycle="animated">
          <Show when={!fallback()} fallback={<MetricsHost id="fallback" drawCalls={13} />}>
            <MetricsHost id="experimental" drawCalls={1} />
          </Show>
          <Nyx2DPerformanceMonitor profile="stable" />
        </div>
      );
    }

    const result = render(() => <Harness />);
    const stage = result.container.querySelector<HTMLElement>('.operator-stage')!;
    await waitFor(() => expect(stage.dataset.nyx2dPerformance).toBe('ok'));

    setFallback(true);
    const fallback = result.container.querySelector<HTMLElement>('[data-testid="fallback"]')!;
    for (let index = 0; index < 5; index += 1) {
      fallback.dataset.drawCalls = String(index % 2 === 0 ? 13 : 14);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    await waitFor(() => expect(stage.dataset.nyx2dPerformance).toBe('warning'));
    expect(stage.dataset.nyx2dPerformanceViolations).toContain('drawCalls');
  });
});
