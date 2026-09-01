import { describe, expect, it } from 'vitest';
import { isProviderReady } from './providerStatus';

const quota = [{ id: 'weekly', label: '7d', usedPercent: 42 }];

describe('isProviderReady', () => {
  it('requires fresh quota data', () => {
    expect(isProviderReady({ freshness: 'fresh', quota })).toBe(true);
    expect(isProviderReady({ freshness: 'stale', quota })).toBe(false);
    expect(isProviderReady({ freshness: 'unavailable', quota })).toBe(false);
    expect(isProviderReady({ freshness: 'fresh', quota: [] })).toBe(false);
  });
});
