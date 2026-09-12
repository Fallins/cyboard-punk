import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OperatorRuntimeState } from './operatorRuntime';

const runtimeSpies = vi.hoisted(() => ({
  productionRenders: 0,
  experimentalRenders: 0,
}));

vi.mock('./Nyx2DWebGL', () => ({
  default: () => {
    runtimeSpies.productionRenders += 1;
    return <div data-testid="production-nyx-runtime" />;
  },
}));

vi.mock('./NyxStage7ExperimentalRuntime', () => ({
  default: (props: { onUnavailable: (reason: string) => void }) => {
    runtimeSpies.experimentalRenders += 1;
    return (
      <button
        type="button"
        data-testid="stage7-experimental-runtime"
        onClick={() => props.onUnavailable('synthetic experimental failure')}>
        experimental
      </button>
    );
  },
}));

import Nyx2DManagedRuntime from './Nyx2DManagedRuntime';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  runtimeSpies.productionRenders = 0;
  runtimeSpies.experimentalRenders = 0;
});

function renderRuntime(state: OperatorRuntimeState = 'idle', onUnavailable = vi.fn()) {
  return render(() => (
    <div class="operator-stage">
      <Nyx2DManagedRuntime
        state={state}
        active={true}
        reducedMotion={false}
        onUnavailable={onUnavailable}
      />
    </div>
  ));
}

describe('Nyx2DManagedRuntime Stage 7 selection', () => {
  it('keeps production NYX as the default runtime', () => {
    vi.stubEnv('VITE_NYX_EXPERIMENTAL_RUNTIME', '');
    renderRuntime();

    expect(screen.getByTestId('production-nyx-runtime')).toBeTruthy();
    expect(screen.queryByTestId('stage7-experimental-runtime')).toBeNull();
    expect(runtimeSpies.productionRenders).toBe(1);
  });

  it('uses Stage 7 only behind the exact opt-in and falls back to production on failure', () => {
    vi.stubEnv('VITE_NYX_EXPERIMENTAL_RUNTIME', 'stage7');
    const outerUnavailable = vi.fn();
    renderRuntime('processing', outerUnavailable);

    expect(screen.getByTestId('stage7-experimental-runtime')).toBeTruthy();
    expect(screen.queryByTestId('production-nyx-runtime')).toBeNull();

    fireEvent.click(screen.getByTestId('stage7-experimental-runtime'));

    expect(screen.getByTestId('production-nyx-runtime')).toBeTruthy();
    expect(outerUnavailable).not.toHaveBeenCalled();
    const stage = screen.getByTestId('production-nyx-runtime').closest('.operator-stage');
    expect(stage?.getAttribute('data-nyx-renderer-tier')).toBe('production-fallback');
    expect(stage?.getAttribute('data-nyx-experimental-failure')).toBe('synthetic experimental failure');
  });

  it('does not remount the selected runtime when semantic state changes', () => {
    vi.stubEnv('VITE_NYX_EXPERIMENTAL_RUNTIME', 'stage7');
    let setState!: (next: OperatorRuntimeState) => void;

    function Harness() {
      const [state, updateState] = createSignal<OperatorRuntimeState>('idle');
      setState = updateState;
      return (
        <div class="operator-stage">
          <Nyx2DManagedRuntime
            state={state()}
            active={true}
            reducedMotion={false}
            onUnavailable={() => undefined}
          />
        </div>
      );
    }

    render(() => <Harness />);
    expect(runtimeSpies.experimentalRenders).toBe(1);

    setState('observing');
    setState('processing');
    setState('warning');

    expect(runtimeSpies.experimentalRenders).toBe(1);
    expect(screen.getByTestId('stage7-experimental-runtime')).toBeTruthy();
  });
});
