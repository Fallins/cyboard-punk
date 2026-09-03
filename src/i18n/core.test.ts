import { describe, expect, it } from 'vitest';
import { formatDurationCompact, freshnessText, isAppLanguage, providerIssueText } from './core';

describe('i18n core', () => {
  it('accepts only supported UI languages', () => {
    expect(isAppLanguage('en')).toBe(true);
    expect(isAppLanguage('zh-TW')).toBe(true);
    expect(isAppLanguage('zh-CN')).toBe(false);
  });

  it('uses compact uppercase duration units for Traditional Chinese', () => {
    expect(formatDurationCompact(30, 'zh-TW')).toBe('30M');
    expect(formatDurationCompact(120, 'zh-TW')).toBe('2H');
    expect(formatDurationCompact(3_000, 'zh-TW')).toBe('2D 2H');
  });

  it('preserves the established lowercase duration units in English', () => {
    expect(formatDurationCompact(30, 'en')).toBe('30m');
    expect(formatDurationCompact(120, 'en')).toBe('2h');
  });

  it('localizes normalized provider state without exposing raw issue copy', () => {
    expect(freshnessText('stale', 'zh-TW')).toBe('快取');
    expect(providerIssueText('rate-limited', 'provider raw message', 'zh-TW')).toBe('暫時受限，稍後重試。');
    expect(providerIssueText('rate-limited', 'provider raw message', 'en')).toBe('provider raw message');
  });
});
