import { For } from 'solid-js';
import type { Nyx2DAttentionTarget } from './nyx2dAttention';
import type { Nyx2DMotionTuning, Nyx2DMotionTuningKey } from './nyx2dTuning';
import type { OperatorRuntimeState } from './operatorRuntime';
import './operator-simulator.css';

interface OperatorSimulatorProps {
  value: OperatorRuntimeState | null;
  attentionValue: Nyx2DAttentionTarget | null;
  tuning: Nyx2DMotionTuning;
  onChange: (state: OperatorRuntimeState | null) => void;
  onAttentionChange: (target: Nyx2DAttentionTarget | null) => void;
  onTuningChange: (key: Nyx2DMotionTuningKey, value: number) => void;
  onResetTuning: () => void;
}

const states: Array<{ value: OperatorRuntimeState; label: string }> = [
  { value: 'idle', label: 'IDLE' },
  { value: 'observing', label: 'OBSERVE' },
  { value: 'processing', label: 'PROCESS' },
  { value: 'warning', label: 'WARNING' },
  { value: 'success', label: 'SUCCESS' },
  { value: 'offline', label: 'OFFLINE' },
];

const attentionTargets: Array<{ value: Nyx2DAttentionTarget; label: string }> = [
  { value: 'center', label: 'CENTER' },
  { value: 'codex', label: 'CODEX' },
  { value: 'claude', label: 'CLAUDE' },
  { value: 'cursor', label: 'CURSOR' },
];

const tuningControls: Array<{
  key: Nyx2DMotionTuningKey;
  label: string;
  max: number;
  step: number;
}> = [
  { key: 'breath', label: 'BREATH', max: 2.5, step: 0.05 },
  { key: 'arms', label: 'FOREARMS', max: 1.25, step: 0.05 },
  { key: 'torso', label: 'UPPER BODY', max: 1.5, step: 0.05 },
  { key: 'head', label: 'HEAD', max: 3, step: 0.25 },
];

export default function OperatorSimulator(props: OperatorSimulatorProps) {
  return (
    <section class="operator-simulator" aria-label="NYX runtime state simulator">
      <div class="operator-simulator__top">
        <div class="operator-simulator__label">
          <span>NYX TEST</span>
          <small>ARTICULATED 2.5D RIG</small>
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
      </div>

      <div class="operator-simulator__attention">
        <span>ATTENTION</span>
        <div class="operator-simulator__buttons" role="group" aria-label="Simulated NYX attention target">
          <button
            type="button"
            class="operator-simulator__button"
            data-active={props.attentionValue === null}
            aria-pressed={props.attentionValue === null}
            onClick={() => props.onAttentionChange(null)}>
            AUTO
          </button>
          <For each={attentionTargets}>
            {(target) => (
              <button
                type="button"
                class="operator-simulator__button"
                data-attention={target.value}
                data-active={props.attentionValue === target.value}
                aria-pressed={props.attentionValue === target.value}
                onClick={() => props.onAttentionChange(target.value)}>
                {target.label}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="operator-simulator__tuning" aria-label="NYX motion tuning">
        <For each={tuningControls}>
          {(control) => (
            <label class="operator-simulator__slider">
              <span>
                <strong>{control.label}</strong>
                <output>{props.tuning[control.key].toFixed(2)}×</output>
              </span>
              <input
                aria-label={`${control.label} motion intensity`}
                type="range"
                min="0"
                max={control.max}
                step={control.step}
                value={props.tuning[control.key]}
                onInput={(event) => props.onTuningChange(control.key, Number(event.currentTarget.value))}
              />
            </label>
          )}
        </For>
        <button type="button" class="operator-simulator__reset" onClick={props.onResetTuning}>
          RESET TUNING
        </button>
      </div>
    </section>
  );
}
