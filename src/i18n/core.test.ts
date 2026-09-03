import { describe, expect, it } from 'vitest';
import {
  formatDurationCompact,
  formatQuotaWindowLabel,
  freshnessText,
  isAppLanguage,
  providerIssueText,
} from './core';

describe('i18n core', () => {
  it('accepts only supported UI languages', () => {
    expect(isAppLanguage('en')).toBe(true);
    expect(isAppLanguage('zh-TW')).toBe(true);
    expect(isAppLanguage('zh-CN')).toBe(false);
  });

  it('uses standard compact time units for Traditional Chinese', () => {
    expect(formatDurationCompact(30, 'zh-TW')).toBe('30min');
    expect(formatDurationCompact(120, 'zh-TW')).toBe('2h');
    expect(formatDurationCompact(3_000, 'zh-TW')).toBe('2d 2h');
  });

  it('preserves the established compact duration units in English', () => {
    expect(formatDurationCompact(30, 'en')).toBe('30m');
    expect(formatDurationCompact(120, 'en')).toBe('2h');
  });

  it('normalizes provider window units to standard symbols only in Traditional Chinese', () => {
    expect(formatQuotaWindowLabel('5h', 'zh-TW')).toBe('5h');
    expect(formatQuotaWindowLabel('7d', 'zh-TW')).toBe('7d');
    expect(formatQuotaWindowLabel('30m', 'zh-TW')).toBe('30min');
    expect(formatQuotaWindowLabel('Current', 'zh-TW')).toBe('Current');
    expect(formatQuotaWindowLabel('7d', 'en')).toBe('7d');
  });

  it('localizes normalized provider state without exposing raw issue copy', () => {
    expect(freshnessText('stale', 'zh-TW')).toBe('快取');
    expect(providerIssueText('rate-limited', 'provider raw message', 'zh-TW')).toBe('暫時受限，稍後重試。');
    expect(providerIssueText('rate-limited', 'provider raw message', 'en')).toBe('provider raw message');
  });
});
