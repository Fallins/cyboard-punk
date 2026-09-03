import { For } from 'solid-js';
import { useI18n } from '../i18n/context';
import Nyx2DDiagnosticStrip from './Nyx2DDiagnosticStrip';
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

const states: OperatorRuntimeState[] = ['idle', 'observing', 'processing', 'warning', 'success', 'offline'];

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
  const { t, language } = useI18n();
  const stateLabel = (state: OperatorRuntimeState) => {
    switch (state) {
      case 'idle': return t('stateIdle');
      case 'observing': return t('stateObserve');
      case 'processing': return t('stateProcess');
      case 'warning': return t('stateWarning');
      case 'success': return t('stateSuccess');
      case 'offline': return t('stateOffline');
    }
  };

  return (
    <section class="operator-simulator" aria-label={t('nyxRuntimeSimulator')}>
      <div class="operator-simulator__top">
        <div class="operator-simulator__label">
          <span>NYX TEST</span>
          <small>{language() === 'zh-TW' ? '2.5D 動作骨架' : 'ARTICULATED 2.5D RIG'}</small>
        </div>
        <div class="operator-simulator__buttons" role="group" aria-label={language() === 'zh-TW' ? '模擬 NYX 狀態' : 'Simulated NYX state'}>
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
                data-state={state}
                data-active={props.value === state}
                aria-pressed={props.value === state}
                onClick={() => props.onChange(state)}>
                {stateLabel(state)}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="operator-simulator__attention">
        <span>{t('attention')}</span>
        <div class="operator-simulator__buttons" role="group" aria-label={language() === 'zh-TW' ? '模擬 NYX 焦點' : 'Simulated NYX attention target'}>
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
                {target.value === 'center' ? t('center') : target.label}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="operator-simulator__tuning" aria-label={t('motionTuning')}>
        <For each={tuningControls}>
          {(control) => (
            <label class="operator-simulator__slider">
              <span>
                <strong>{control.label}</strong>
                <output>{props.tuning[control.key].toFixed(2)}×</output>
              </span>
              <input
                aria-label={`${control.label} ${language() === 'zh-TW' ? '動作幅度' : 'motion intensity'}`}
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
          {t('resetTuning')}
        </button>
      </div>

      <Nyx2DDiagnosticStrip />
    </section>
  );
}
