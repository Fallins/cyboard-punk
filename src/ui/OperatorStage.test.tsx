import { cleanup, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import OperatorStage from './OperatorStage';
import type { OperatorProviderPanel } from './operatorRuntime';

afterEach(cleanup);

const providers: OperatorProviderPanel[] = [
  { provider: 'codex', label: 'Codex', state: 'ready', remainingPercent: 82 },
  { provider: 'claude', label: 'Claude Code', state: 'warning', remainingPercent: 21 },
  { provider: 'cursor', label: 'Cursor', state: 'active', remainingPercent: 36 },
  { provider: 'antigravity', label: 'Antigravity', state: 'offline' },
];

describe('OperatorStage', () => {
  it('renders NYX in warning state and provider HUD data', () => {
    render(() => (
      <OperatorStage
        mode="female"
        readyProviders={3}
        totalProviders={4}
        activeAgents={0}
        providers={providers}
      />
    ));
    expect(screen.getByText('NYX')).toBeTruthy();
    expect(screen.getAllByText('WARNING').length).toBeGreaterThan(0);
    expect(screen.getByText('3/4 PROVIDERS READY')).toBeTruthy();
    expect(screen.getByText('82% LEFT')).toBeTruthy();
    expect(screen.getByText('Claude Code')).toBeTruthy();
    expect(screen.getByLabelText('female CYBOARD operator, warning')).toBeTruthy();
  });

  it('renders AXON in processing state while agents are active', () => {
    render(() => (
      <OperatorStage
        mode="male"
        readyProviders={2}
        totalProviders={4}
        activeAgents={1}
        providers={providers}
      />
    ));
    expect(screen.getByText('AXON')).toBeTruthy();
    expect(screen.getByText('PROCESSING')).toBeTruthy();
    expect(screen.getByLabelText('male CYBOARD operator, processing')).toBeTruthy();
  });

  it('enters offline state when no enabled provider is ready', () => {
    render(() => (
      <OperatorStage
        mode="female"
        readyProviders={0}
        totalProviders={4}
        activeAgents={0}
        providers={providers.map((panel) => ({ ...panel, state: 'offline' as const, remainingPercent: undefined }))}
      />
    ));
    expect(screen.getAllByText('OFFLINE').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('female CYBOARD operator, offline')).toBeTruthy();
  });
});
