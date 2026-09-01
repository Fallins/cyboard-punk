import { cleanup, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import OperatorStage from './OperatorStage';

afterEach(cleanup);

describe('OperatorStage', () => {
  it('renders NYX in idle state for the female operator', () => {
    render(() => <OperatorStage mode="female" readyProviders={3} totalProviders={4} activeAgents={0} />);
    expect(screen.getByText('NYX')).toBeTruthy();
    expect(screen.getByText('IDLE')).toBeTruthy();
    expect(screen.getByText('3/4 PROVIDERS READY')).toBeTruthy();
    expect(screen.getByLabelText('female CYBOARD operator, idle')).toBeTruthy();
  });

  it('renders AXON in working state while agents are active', () => {
    render(() => <OperatorStage mode="male" readyProviders={2} totalProviders={4} activeAgents={1} />);
    expect(screen.getByText('AXON')).toBeTruthy();
    expect(screen.getByText('WORKING')).toBeTruthy();
    expect(screen.getByLabelText('male CYBOARD operator, working')).toBeTruthy();
  });

  it('enters offline state when no enabled provider is ready', () => {
    render(() => <OperatorStage mode="female" readyProviders={0} totalProviders={4} activeAgents={0} />);
    expect(screen.getByText('OFFLINE')).toBeTruthy();
  });
});
