import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NYX_2D_TEST_TUNING } from './nyx2dTuning';
import OperatorSimulator from './OperatorSimulator';

afterEach(cleanup);

const noopTuning = () => undefined;

describe('OperatorSimulator', () => {
  it('renders runtime state, provider attention, and articulated motion controls', () => {
    render(() => (
      <OperatorSimulator
        value={null}
        attentionValue={null}
        tuning={NYX_2D_TEST_TUNING}
        onChange={() => undefined}
        onAttentionChange={() => undefined}
        onTuningChange={noopTuning}
        onResetTuning={() => undefined}
      />
    ));

    expect(screen.getByRole('group', { name: 'Simulated NYX state' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Simulated NYX attention target' })).toBeTruthy();
    for (const label of ['IDLE', 'OBSERVE', 'PROCESS', 'WARNING', 'SUCCESS', 'OFFLINE']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    for (const label of ['CENTER', 'CODEX', 'CLAUDE', 'CURSOR']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('slider', { name: 'BREATH motion intensity' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'FOREARMS motion intensity' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'UPPER BODY motion intensity' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'HEAD motion intensity' })).toBeTruthy();
  });

  it('emits a state override and can return to automatic runtime state', async () => {
    const onChange = vi.fn();
    render(() => (
      <OperatorSimulator
        value="warning"
        attentionValue={null}
        tuning={NYX_2D_TEST_TUNING}
        onChange={onChange}
        onAttentionChange={() => undefined}
        onTuningChange={noopTuning}
        onResetTuning={() => undefined}
      />
    ));

    expect(screen.getByRole('button', { name: 'WARNING' }).getAttribute('aria-pressed')).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: 'SUCCESS' }));
    expect(onChange).toHaveBeenCalledWith('success');
  });

  it('emits provider attention overrides independently of state', async () => {
    const onAttentionChange = vi.fn();
    render(() => (
      <OperatorSimulator
        value="processing"
        attentionValue="codex"
        tuning={NYX_2D_TEST_TUNING}
        onChange={() => undefined}
        onAttentionChange={onAttentionChange}
        onTuningChange={noopTuning}
        onResetTuning={() => undefined}
      />
    ));

    const group = screen.getByRole('group', { name: 'Simulated NYX attention target' });
    expect(group.querySelector('[data-attention="codex"]')?.getAttribute('aria-pressed')).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: 'CURSOR' }));
    expect(onAttentionChange).toHaveBeenCalledWith('cursor');
    const auto = group.querySelector('button:not([data-attention])') as HTMLButtonElement;
    await fireEvent.click(auto);
    expect(onAttentionChange).toHaveBeenCalledWith(null);
  });

  it('emits independent forearm and upper-body tuning changes plus reset requests', async () => {
    const onTuningChange = vi.fn();
    const onResetTuning = vi.fn();
    render(() => (
      <OperatorSimulator
        value="observing"
        attentionValue={null}
        tuning={NYX_2D_TEST_TUNING}
        onChange={() => undefined}
        onAttentionChange={() => undefined}
        onTuningChange={onTuningChange}
        onResetTuning={onResetTuning}
      />
    ));

    await fireEvent.input(screen.getByRole('slider', { name: 'FOREARMS motion intensity' }), {
      target: { value: '1.2' },
    });
    expect(onTuningChange).toHaveBeenCalledWith('arms', 1.2);

    await fireEvent.input(screen.getByRole('slider', { name: 'UPPER BODY motion intensity' }), {
      target: { value: '1.3' },
    });
    expect(onTuningChange).toHaveBeenCalledWith('torso', 1.3);

    await fireEvent.click(screen.getByRole('button', { name: 'RESET TUNING' }));
    expect(onResetTuning).toHaveBeenCalledTimes(1);
  });
});
