import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NYX_2D_TEST_TUNING } from './nyx2dTuning';
import OperatorSimulator from './OperatorSimulator';

afterEach(cleanup);

const noopTuning = () => undefined;

describe('OperatorSimulator', () => {
  it('renders AUTO plus every NYX runtime state and clean motion controls', () => {
    render(() => (
      <OperatorSimulator
        value={null}
        tuning={NYX_2D_TEST_TUNING}
        onChange={() => undefined}
        onTuningChange={noopTuning}
        onResetTuning={() => undefined}
      />
    ));

    for (const label of ['AUTO', 'IDLE', 'OBSERVE', 'PROCESS', 'WARNING', 'SUCCESS', 'OFFLINE']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'AUTO' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('slider', { name: 'BREATH motion intensity' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'FOREARMS motion intensity' })).toBeTruthy();
    expect(screen.queryByRole('slider', { name: 'TORSO motion intensity' })).toBeNull();
    expect(screen.getByRole('slider', { name: 'HEAD motion intensity' })).toBeTruthy();
  });

  it('emits a state override and can return to automatic runtime state', async () => {
    const onChange = vi.fn();
    render(() => (
      <OperatorSimulator
        value="warning"
        tuning={NYX_2D_TEST_TUNING}
        onChange={onChange}
        onTuningChange={noopTuning}
        onResetTuning={() => undefined}
      />
    ));

    expect(screen.getByRole('button', { name: 'WARNING' }).getAttribute('aria-pressed')).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: 'SUCCESS' }));
    expect(onChange).toHaveBeenCalledWith('success');

    await fireEvent.click(screen.getByRole('button', { name: 'AUTO' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('emits live forearm tuning changes and reset requests', async () => {
    const onTuningChange = vi.fn();
    const onResetTuning = vi.fn();
    render(() => (
      <OperatorSimulator
        value="observing"
        tuning={NYX_2D_TEST_TUNING}
        onChange={() => undefined}
        onTuningChange={onTuningChange}
        onResetTuning={onResetTuning}
      />
    ));

    await fireEvent.input(screen.getByRole('slider', { name: 'FOREARMS motion intensity' }), {
      target: { value: '1.2' },
    });
    expect(onTuningChange).toHaveBeenCalledWith('arms', 1.2);

    await fireEvent.click(screen.getByRole('button', { name: 'RESET TUNING' }));
    expect(onResetTuning).toHaveBeenCalledTimes(1);
  });
});
