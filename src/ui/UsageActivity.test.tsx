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
          { at: '2026-09-03T01:00:00Z', tokens: 12_000, project: 'cyboard-punk' },
          { at: '2026-09-03T02:00:00Z', tokens: 8_000, project: 'cyboard-punk' },
          { at: '2026-09-03T03:00:00Z', tokens: 5_000, project: 'lumen-lex' },
        ],
      }),
    );

    expect(summary?.tokens).toBe(25_000);
    expect(summary?.samples).toBe(3);
    expect(summary?.projects).toEqual([
      { project: 'cyboard-punk', tokens: 20_000 },
      { project: 'lumen-lex', tokens: 5_000 },
    ]);
    expect(summary?.latestAt).toBe('2026-09-03T03:00:00Z');
  });

  it('formats token totals compactly', () => {
    expect(formatTokenCount(999)).toBe('999');
    expect(formatTokenCount(1_250)).toBe('1.3K');
    expect(formatTokenCount(1_250_000)).toBe('1.3M');
  });

  it('renders provider totals and project attribution', () => {
    render(() => (
      <UsageActivity
        snapshots={[
          snapshot({
            usage: [
              { at: '2026-09-03T01:00:00Z', tokens: 12_000, project: 'cyboard-punk' },
              { at: '2026-09-03T02:00:00Z', tokens: 8_000, project: 'lumen-lex' },
            ],
          }),
        ]}
      />
    ));

    expect(screen.getByRole('heading', { name: 'Token Activity' })).toBeTruthy();
    expect(screen.getByText('20K tokens')).toBeTruthy();
    expect(screen.getByText('cyboard-punk')).toBeTruthy();
    expect(screen.getByText('lumen-lex')).toBeTruthy();
  });
});
