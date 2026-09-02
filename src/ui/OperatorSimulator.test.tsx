import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OperatorSimulator from './OperatorSimulator';

afterEach(cleanup);

describe('OperatorSimulator', () => {
  it('renders AUTO plus every NYX runtime state', () => {
    render(() => <OperatorSimulator value={null} onChange={() => undefined} />);

    for (const label of ['AUTO', 'IDLE', 'OBSERVE', 'PROCESS', 'WARNING', 'SUCCESS', 'OFFLINE']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'AUTO' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('emits a state override and can return to automatic runtime state', async () => {
    const onChange = vi.fn();
    render(() => <OperatorSimulator value="warning" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'WARNING' }).getAttribute('aria-pressed')).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: 'SUCCESS' }));
    expect(onChange).toHaveBeenCalledWith('success');

    await fireEvent.click(screen.getByRole('button', { name: 'AUTO' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
