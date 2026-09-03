import { cleanup, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProviderSnapshot } from '../domain/types';
import UsageActivity, { formatTokenCount, summarizeProviderUsage } from './UsageActivity';

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
    expect(summary?.latestAt).toBe('2026-09-03T03:00:00Z');
  });

  it('aggregates request-level input cache and output breakdowns', () => {
    const summary = summarizeProviderUsage(
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
            scope: 'request',
          },
          {
            at: '2026-09-03T04:00:00Z',
            tokens: 120,
            inputTokens: 5,
            cachedInputTokens: 90,
            cacheCreationInputTokens: 0,
            outputTokens: 25,
            project: 'cyboard-punk',
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
  });

  it('does not render preserved samples when the current snapshot has no usage capability', () => {
    expect(
      summarizeProviderUsage(
        snapshot({
          capabilities: ['quota'],
          usage: [{ at: '2026-09-03T01:00:00Z', tokens: 12_000, project: 'cyboard-punk' }],
        }),
      ),
    ).toBeNull();
  });

  it('formats token totals compactly', () => {
    expect(formatTokenCount(999)).toBe('999');
    expect(formatTokenCount(1_250)).toBe('1.3K');
    expect(formatTokenCount(1_250_000)).toBe('1.3M');
  });

  it('renders provider totals project attribution and request breakdowns', () => {
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
                scope: 'request',
              },
            ],
          }),
        ]}
      />
    ));

    expect(screen.getByRole('heading', { name: 'Local Token Totals' })).toBeTruthy();
    expect(screen.getByText('20K tokens')).toBeTruthy();
    expect(screen.getByText('2 recent indexed threads')).toBeTruthy();
    expect(screen.getByText('1 recent request')).toBeTruthy();
    expect(screen.getAllByText('cyboard-punk').length).toBeGreaterThan(0);
    expect(screen.getByText('lumen-lex')).toBeTruthy();
    expect(screen.getByLabelText('Claude Code token breakdown')).toBeTruthy();
  });
});
