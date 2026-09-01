import { describe, expect, it } from 'vitest';
import type { ProviderSnapshot } from '../domain/types';
import {
  buildOperatorProviderPanels,
  operatorAnimationCandidates,
  operatorAssetPath,
  operatorPosterPath,
  resolveOperatorRuntimeState,
} from './operatorRuntime';

describe('operator runtime', () => {
  it('maps provider and agent health to stable runtime states', () => {
    expect(resolveOperatorRuntimeState({ readyProviders: 0, totalProviders: 4, activeAgents: 0 })).toBe('offline');
    expect(resolveOperatorRuntimeState({ readyProviders: 4, totalProviders: 4, activeAgents: 2 })).toBe('processing');
    expect(resolveOperatorRuntimeState({ readyProviders: 3, totalProviders: 4, activeAgents: 0 })).toBe('warning');
    expect(resolveOperatorRuntimeState({ readyProviders: 4, totalProviders: 4, activeAgents: 0 })).toBe('idle');
  });

  it('keeps production asset paths stable for NYX and AXON', () => {
    expect(operatorAssetPath('female')).toBe('/operator/nyx/nyx.glb');
    expect(operatorAssetPath('male')).toBe('/operator/axon/axon.glb');
    expect(operatorPosterPath('female')).toBe('/operator/nyx/poster.webp');
    expect(operatorPosterPath('male')).toBe('/operator/axon/poster.webp');
  });

  it('falls back through compatible animation names', () => {
    expect(operatorAnimationCandidates('processing')).toEqual(['processing', 'working', 'observing', 'idle']);
    expect(operatorAnimationCandidates('warning')).toEqual(['warning', 'observing', 'idle']);
    expect(operatorAnimationCandidates('offline')).toEqual(['offline', 'idle']);
  });

  it('derives compact HUD panels from provider health and constrained quota', () => {
    const snapshots: ProviderSnapshot[] = [
      {
        provider: 'codex',
        displayName: 'Codex',
        capabilities: ['quota'],
        quota: [
          { id: '5h', label: '5h', usedPercent: 12 },
          { id: '7d', label: '7d', usedPercent: 76 },
        ],
        quotaHistory: [],
        usage: [],
        sessions: [],
        freshness: 'fresh',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        provider: 'claude',
        displayName: 'Claude Code',
        capabilities: ['quota', 'sessions'],
        quota: [{ id: '7d', label: '7d', usedPercent: 30 }],
        quotaHistory: [],
        usage: [],
        sessions: [
          { id: 'claude-1', provider: 'claude', status: 'active' },
        ],
        freshness: 'fresh',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        provider: 'antigravity',
        displayName: 'Antigravity',
        capabilities: [],
        quota: [],
        quotaHistory: [],
        usage: [],
        sessions: [],
        freshness: 'unavailable',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    expect(buildOperatorProviderPanels(snapshots)).toEqual([
      { provider: 'codex', label: 'Codex', state: 'ready', remainingPercent: 24 },
      { provider: 'claude', label: 'Claude Code', state: 'active', remainingPercent: 70 },
      { provider: 'antigravity', label: 'Antigravity', state: 'offline', remainingPercent: undefined },
    ]);
  });

  it('marks low remaining quota and stale snapshots as warnings', () => {
    const snapshot: ProviderSnapshot = {
      provider: 'cursor',
      displayName: 'Cursor',
      capabilities: ['quota'],
      quota: [{ id: 'plan', label: 'Cursor Models', usedPercent: 84 }],
      quotaHistory: [],
      usage: [],
      sessions: [],
      freshness: 'fresh',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    expect(buildOperatorProviderPanels([snapshot])[0]).toMatchObject({
      state: 'warning',
      remainingPercent: 16,
    });

    snapshot.quota[0].usedPercent = 10;
    snapshot.freshness = 'stale';
    expect(buildOperatorProviderPanels([snapshot])[0].state).toBe('warning');
  });
});
