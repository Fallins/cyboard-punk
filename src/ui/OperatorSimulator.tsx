import { For } from 'solid-js';
import type { OperatorRuntimeState } from './operatorRuntime';
import './operator-simulator.css';

interface OperatorSimulatorProps {
  value: OperatorRuntimeState | null;
  onChange: (state: OperatorRuntimeState | null) => void;
}

const states: Array<{ value: OperatorRuntimeState; label: string }> = [
  { value: 'idle', label: 'IDLE' },
  { value: 'observing', label: 'OBSERVE' },
  { value: 'processing', label: 'PROCESS' },
  { value: 'warning', label: 'WARNING' },
  { value: 'success', label: 'SUCCESS' },
  { value: 'offline', label: 'OFFLINE' },
];

export default function OperatorSimulator(props: OperatorSimulatorProps) {
  return (
    <section class="operator-simulator" aria-label="NYX runtime state simulator">
      <div class="operator-simulator__label">
        <span>NYX TEST</span>
        <small>STATE OVERRIDE</small>
      </div>
      <div class="operator-simulator__buttons" role="group" aria-label="Simulated NYX state">
        <button
          type="button"
          class="operator-simulator__button"
          data-active={props.value === null}
          aria-pressed={props.value === null}
          onClick={() => props.onChange(null)}>
          AUTO
        </button>
        <For each={states}>
          {(state) => (
            <button
              type="button"
              class="operator-simulator__button"
              data-state={state.value}
              data-active={props.value === state.value}
              aria-pressed={props.value === state.value}
              onClick={() => props.onChange(state.value)}>
              {state.label}
            </button>
          )}
        </For>
      </div>
    </section>
  );
}
