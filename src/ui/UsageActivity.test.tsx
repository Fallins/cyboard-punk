import { cleanup, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProviderSnapshot } from '../domain/types';
import UsageActivity, { formatTokenCount, formatUsageCost, summarizeProviderUsage } from './UsageActivity';

function snapshot(overrides: Partial<ProviderSnapshot> = {}): ProviderSnapshot {
  return {
    provider: 'codex',
    displayName: 'Codex',
    capabilities: ['usage', 'projectUsage'],
    quota: [],
    quotaHistory: [],
    usage: [],
    sessions: [],
    freshness: 'fresh',
    updatedAt: '2026-09-03T00:00:00Z',
    ...overrides,
  };
}

afterEach(cleanup);

describe('UsageActivity', () => {
  it('aggregates recent thread totals by project', () => {
    const summary = summarizeProviderUsage(
      snapshot({
        usage: [
          { at: '2026-09-03T01:00:00Z', tokens: 12_000, project: 'cyboard-punk', scope: 'thread-total' },
          { at: '2026-09-03T02:00:00Z', tokens: 8_000, project: 'cyboard-punk', scope: 'thread-total' },
          { at: '2026-09-03T03:00:00Z', tokens: 5_000, project: 'lumen-lex', scope: 'thread-total' },
        ],
      }),
    );

    expect(summary?.tokens).toBe(25_000);
    expect(summary?.samples).toBe(3);
    expect(summary?.scope).toBe('thread-total');
    expect(summary?.projects).toEqual([
      { project: 'cyboard-punk', tokens: 20_000 },
      { project: 'lumen-lex', tokens: 5_000 },
    ]);
    expect(summary?.models).toEqual([]);
    expect(summary?.latestAt).toBe('2026-09-03T03:00:00Z');
  });

  it('aggregates request-level input cache output model and measured cost', () => {
    const summary = summarizeProviderUsage(
      snapshot({
        provider: 'cursor',
        displayName: 'Cursor',
        capabilities: ['usage'],
        usage: [
          {
            at: '2026-09-03T03:00:00Z',
            tokens: 313,
            inputTokens: 3,
            cachedInputTokens: 200,
            cacheCreationInputTokens: 100,
            outputTokens: 10,
            costUsd: 0.025,
            model: 'claude-4.7-sonnet',
            scope: 'request',
          },
          {
            at: '2026-09-03T04:00:00Z',
            tokens: 120,
            inputTokens: 5,
            cachedInputTokens: 90,
            cacheCreationInputTokens: 0,
            outputTokens: 25,
            costUsd: 0.01,
            model: 'claude-4.7-sonnet',
            scope: 'request',
          },
        ],
      }),
    );

    expect(summary?.scope).toBe('request');
    expect(summary?.tokens).toBe(433);
    expect(summary?.inputTokens).toBe(8);
    expect(summary?.cachedInputTokens).toBe(290);
    expect(summary?.cacheCreationInputTokens).toBe(100);
    expect(summary?.outputTokens).toBe(35);
    expect(summary?.costUsd).toBeCloseTo(0.035);
    expect(summary?.models).toEqual([{ model: 'claude-4.7-sonnet', tokens: 433 }]);
    expect(summary?.projects).toEqual([]);
  });

  it('hides partial breakdowns and partial measured cost instead of filling missing values with zero', () => {
    const summary = summarizeProviderUsage(
      snapshot({
        provider: 'cursor',
        displayName: 'Cursor',
        capabilities: ['usage'],
        usage: [
          {
            at: '2026-09-03T03:00:00Z',
            tokens: 200,
            inputTokens: 50,
            cachedInputTokens: 100,
            cacheCreationInputTokens: 30,
            outputTokens: 20,
            costUsd: 0.02,
            scope: 'request',
          },
          {
            at: '2026-09-03T04:00:00Z',
            tokens: 100,
            inputTokens: 80,
            outputTokens: 20,
            scope: 'request',
          },
        ],
      }),
    );

    expect(summary?.tokens).toBe(300);
    expect(summary?.inputTokens).toBeUndefined();
    expect(summary?.cachedInputTokens).toBeUndefined();
    expect(summary?.cacheCreationInputTokens).toBeUndefined();
    expect(summary?.outputTokens).toBeUndefined();
    expect(summary?.costUsd).toBeUndefined();
  });

  it('keeps bounded measured samples visible when a refresh omits the usage capability', () => {
    const summary = summarizeProviderUsage(
      snapshot({
        capabilities: ['quota'],
        usage: [{ at: '2026-09-03T01:00:00Z', tokens: 12_000, project: 'cyboard-punk', scope: 'thread-total' }],
      }),
    );

    expect(summary?.tokens).toBe(12_000);
    expect(summary?.projects).toEqual([{ project: 'cyboard-punk', tokens: 12_000 }]);
  });

  it('formats token totals and measured costs compactly', () => {
    expect(formatTokenCount(999)).toBe('999');
    expect(formatTokenCount(1_250)).toBe('1.3K');
    expect(formatTokenCount(1_250_000)).toBe('1.3M');
    expect(formatUsageCost(0.005)).toBe('<$0.01');
    expect(formatUsageCost(1.25)).toBe('$1.25');
  });

  it('renders provider totals project attribution request breakdowns model mix and cursor no-project state', () => {
    render(() => (
      <UsageActivity
        snapshots={[
          snapshot({
            usage: [
              { at: '2026-09-03T01:00:00Z', tokens: 12_000, project: 'cyboard-punk', scope: 'thread-total' },
              { at: '2026-09-03T02:00:00Z', tokens: 8_000, project: 'lumen-lex', scope: 'thread-total' },
            ],
          }),
          snapshot({
            provider: 'claude',
            displayName: 'Claude Code',
            usage: [
              {
                at: '2026-09-03T03:00:00Z',
                tokens: 313,
                inputTokens: 3,
                cachedInputTokens: 200,
                cacheCreationInputTokens: 100,
                outputTokens: 10,
                project: 'cyboard-punk',
                model: 'claude-opus-4-7',
                scope: 'request',
              },
            ],
          }),
          snapshot({
            provider: 'cursor',
            displayName: 'Cursor',
            capabilities: ['usage'],
            usage: [
              {
                at: '2026-09-03T04:00:00Z',
                tokens: 550,
                inputTokens: 100,
                cachedInputTokens: 400,
                cacheCreationInputTokens: 30,
                outputTokens: 20,
                costUsd: 0.025,
                model: 'claude-4.7-sonnet',
                scope: 'request',
              },
            ],
          }),
        ]}
      />
    ));

    expect(screen.getByRole('heading', { name: 'Token Activity' })).toBeTruthy();
    expect(screen.getByText('3/3 SOURCES')).toBeTruthy();
    expect(screen.getByText('20K tokens')).toBeTruthy();
    expect(screen.getByText('2 recent indexed threads')).toBeTruthy();
    expect(screen.getAllByText('1 recent request').length).toBe(2);
    expect(screen.getAllByText('cyboard-punk').length).toBeGreaterThan(0);
    expect(screen.getByText('lumen-lex')).toBeTruthy();
    expect(screen.getByLabelText('Claude Code token breakdown')).toBeTruthy();
    expect(screen.getByLabelText('Cursor token breakdown')).toBeTruthy();
    expect(screen.getByText('claude-4.7-sonnet')).toBeTruthy();
    expect(screen.getByText('$0.03 measured')).toBeTruthy();
    expect(screen.getByText('Project attribution unavailable for these samples.')).toBeTruthy();
  });

  it('renders every provider and makes missing telemetry explicit instead of implying single-provider support', () => {
    render(() => (
      <UsageActivity
        snapshots={[
          snapshot({ capabilities: ['quota'], usage: [] }),
          snapshot({
            provider: 'claude',
            displayName: 'Claude Code',
            usage: [{ at: '2026-09-03T03:00:00Z', tokens: 54_000_000, scope: 'request' }],
          }),
          snapshot({ provider: 'cursor', displayName: 'Cursor', capabilities: ['quota'], usage: [] }),
        ]}
      />
    ));

    expect(screen.getByText('1/3 SOURCES')).toBeTruthy();
    expect(screen.getByLabelText('Codex Token Activity')).toBeTruthy();
    expect(screen.getByLabelText('Claude Code Token Activity')).toBeTruthy();
    expect(screen.getByLabelText('Cursor Token Activity')).toBeTruthy();
    expect(screen.getAllByText('No reliable token data yet')).toHaveLength(2);
    expect(screen.getByText('54M tokens')).toBeTruthy();
  });
});
