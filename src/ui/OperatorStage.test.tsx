import { cleanup, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import OperatorStage, { operatorRendererMode } from './OperatorStage';
import type { OperatorProviderPanel } from './operatorRuntime';

afterEach(cleanup);

const providers: OperatorProviderPanel[] = [
  { provider: 'codex', label: 'Codex', state: 'ready', remainingPercent: 82 },
  { provider: 'claude', label: 'Claude Code', state: 'warning', remainingPercent: 21 },
  { provider: 'cursor', label: 'Cursor', state: 'active', remainingPercent: 36 },
];

describe('OperatorStage', () => {
  it('keeps WebGL mounted when reduced motion is requested', () => {
    expect(operatorRendererMode(true, null)).toBe('webgl-paused');
    expect(operatorRendererMode(false, null)).toBe('webgl');
    expect(operatorRendererMode(true, 'loader failed')).toBe('fallback');
  });

  it('renders NYX in warning state and provider HUD data', () => {
    render(() => (
      <OperatorStage
        mode="female"
        readyProviders={2}
        totalProviders={3}
        activeAgents={0}
        providers={providers}
      />
    ));
    expect(screen.getByText('NYX')).toBeTruthy();
    expect(screen.getAllByText('WARNING').length).toBeGreaterThan(0);
    expect(screen.getByText('2/3 PROVIDERS READY')).toBeTruthy();
    expect(screen.getByText('82% LEFT')).toBeTruthy();
    expect(screen.getByText('Claude Code')).toBeTruthy();
    expect(screen.getByLabelText('NYX CYBOARD operator, warning')).toBeTruthy();
  });

  it('renders AXON in processing state while agents are active', () => {
    render(() => (
      <OperatorStage
        mode="male"
        readyProviders={2}
        totalProviders={3}
        activeAgents={1}
        providers={providers}
      />
    ));
    expect(screen.getByText('AXON')).toBeTruthy();
    expect(screen.getByText('PROCESSING')).toBeTruthy();
    expect(screen.getByLabelText('AXON CYBOARD operator, processing')).toBeTruthy();
  });

  it('shows observing while a provider scan is active', () => {
    render(() => (
      <OperatorStage
        mode="female"
        readyProviders={2}
        totalProviders={3}
        activeAgents={0}
        providers={providers}
        transientState="observing"
      />
    ));
    expect(screen.getByText('OBSERVING')).toBeTruthy();
    expect(screen.getByLabelText('NYX CYBOARD operator, observing')).toBeTruthy();
  });

  it('shows a success acknowledgement after a healthy refresh', () => {
    render(() => (
      <OperatorStage
        mode="male"
        readyProviders={3}
        totalProviders={3}
        activeAgents={0}
        providers={providers.map((panel) => ({ ...panel, state: 'ready' as const }))}
        transientState="success"
      />
    ));
    expect(screen.getByText('SUCCESS')).toBeTruthy();
    expect(screen.getByLabelText('AXON CYBOARD operator, success')).toBeTruthy();
  });

  it('enters offline state when no enabled provider is ready', () => {
    render(() => (
      <OperatorStage
        mode="female"
        readyProviders={0}
        totalProviders={3}
        activeAgents={0}
        providers={providers.map((panel) => ({ ...panel, state: 'offline' as const, remainingPercent: undefined }))}
      />
    ));
    expect(screen.getAllByText('OFFLINE').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('NYX CYBOARD operator, offline')).toBeTruthy();
  });
});
