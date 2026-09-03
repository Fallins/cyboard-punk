import { cleanup, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./Nyx2DManagedRuntime', () => ({
  default: () => null,
}));

import OperatorStage, { operatorRendererMode } from './OperatorStage';
import type { OperatorProviderPanel } from './operatorRuntime';

afterEach(cleanup);

const providers: OperatorProviderPanel[] = [
  { provider: 'codex', label: 'Codex', state: 'ready', remainingPercent: 82 },
  { provider: 'claude', label: 'Claude Code', state: 'warning', remainingPercent: 21 },
  { provider: 'cursor', label: 'Cursor', state: 'active', remainingPercent: 36 },
];

describe('OperatorStage', () => {
  it('keeps renderer state explicit when reduced motion is requested', () => {
    expect(operatorRendererMode(true, null)).toBe('2d-webgl-paused');
    expect(operatorRendererMode(false, null)).toBe('2d-webgl');
    expect(operatorRendererMode(true, 'loader failed')).toBe('fallback');
    expect(operatorRendererMode(false, null, 'axon-webgl')).toBe('webgl');
    expect(operatorRendererMode(true, null, 'axon-webgl')).toBe('webgl-paused');
  });

  it('renders NYX only through the production 2D path and resolves provider attention', () => {
    render(() => (
      <OperatorStage
        mode="female"
        readyProviders={2}
        totalProviders={3}
        activeAgents={0}
        providers={providers}
        briefHeadline="Claude Code capacity is getting tight"
        briefTone="advisory"
      />
    ));
    expect(screen.getByText('NYX')).toBeTruthy();
    expect(screen.getAllByText('WARNING').length).toBeGreaterThan(0);
    expect(screen.getByText('2/3 PROVIDERS READY')).toBeTruthy();
    expect(screen.getByText('82% LEFT')).toBeTruthy();
    expect(screen.getByText('Claude Code')).toBeTruthy();
    expect(screen.getByText('Claude Code capacity is getting tight')).toBeTruthy();
    const stage = screen.getByLabelText('NYX CYBOARD operator, warning');
    expect(stage.getAttribute('data-nyx-renderer-tier')).toBe('production');
    expect(stage.getAttribute('data-renderer')).toBe('2d-webgl');
    expect(stage.getAttribute('data-attention-target')).toBe('claude');
    expect(stage.getAttribute('data-attention-override')).toBeNull();
    expect(stage.querySelector('.operator-intelligence')?.getAttribute('data-tone')).toBe('advisory');
  });

  it('accepts diagnostic state and attention overrides without changing provider HUD inputs', () => {
    render(() => (
      <OperatorStage
        mode="female"
        readyProviders={2}
        totalProviders={3}
        activeAgents={1}
        providers={providers}
        stateOverride="success"
        attentionOverride="cursor"
      />
    ));

    const stage = screen.getByLabelText('NYX CYBOARD operator, success');
    expect(stage.getAttribute('data-state-override')).toBe('success');
    expect(stage.getAttribute('data-attention-target')).toBe('cursor');
    expect(stage.getAttribute('data-attention-override')).toBe('cursor');
    expect(screen.getByText('2/3 PROVIDERS READY')).toBeTruthy();
    expect(screen.getByText('Claude Code')).toBeTruthy();
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
