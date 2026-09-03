import { describe, expect, it } from 'vitest';
import type { StatusIntelligence } from './statusIntelligence';
import { answerStatusQuery, classifyStatusQuery } from './statusQuery';

function intelligence(overrides: Partial<StatusIntelligence> = {}): StatusIntelligence {
  return {
    tone: 'advisory',
    headline: 'Claude Code is the safest current route',
    summary: 'Claude Code: 78% left on 7d. 2 active sessions. Cursor Current resets in 1h 30m.',
    recommendedProvider: 'claude',
    activeSessions: 2,
    nearestReset: {
      provider: 'cursor',
      displayName: 'Cursor',
      windowLabel: 'Current',
      resetAt: '2026-09-03T09:30:00Z',
      minutesUntil: 90,
    },
    recentProject: { project: 'cyboard-punk', tokens: 8_000, sharePercent: 72 },
    signals: [],
    ...overrides,
  };
}

describe('status query', () => {
  it('classifies bounded English and Traditional Chinese intents locally', () => {
    expect(classifyStatusQuery('Which provider should I use?')).toBe('route');
    expect(classifyStatusQuery('下一個 reset 是什麼時候')).toBe('reset');
    expect(classifyStatusQuery('現在有幾個 agent 在執行')).toBe('sessions');
    expect(classifyStatusQuery('最近哪個專案最燒 token')).toBe('project');
    expect(classifyStatusQuery('overall status')).toBe('overview');
    expect(classifyStatusQuery('tell me a joke')).toBe('help');
  });

  it('answers routing questions from the deterministic brief instead of inventing a provider score', () => {
    const answer = answerStatusQuery('best provider?', intelligence());
    expect(answer.intent).toBe('route');
    expect(answer.answer).toContain('Claude Code is the safest current route');
    expect(answer.answer).toContain('78% left on 7d');
  });

  it('answers reset, active-session and recent-project questions from normalized fields', () => {
    expect(answerStatusQuery('next reset', intelligence()).answer).toBe('Cursor Current resets in 1h 30m.');
    expect(answerStatusQuery('active agents', intelligence()).answer).toBe('2 active sessions are currently detected.');
    expect(answerStatusQuery('最近哪個專案最燒', intelligence()).answer).toBe(
      'cyboard-punk leads recent project-attributed request activity with 72% of measured tokens in the last 24 hours.',
    );
  });

  it('degrades explicitly when an answer is not supported by current evidence', () => {
    const empty = intelligence({
      recommendedProvider: undefined,
      nearestReset: undefined,
      recentProject: undefined,
      activeSessions: 0,
      headline: 'No provider has a current quota signal',
      summary: 'No fresh quota window is available for routing.',
    });

    expect(answerStatusQuery('best provider', empty).answer).toContain('No fresh provider quota');
    expect(answerStatusQuery('next reset', empty).answer).toContain('No future provider reset');
    expect(answerStatusQuery('recent project', empty).answer).toContain('No recent project-attributed request telemetry');
  });

  it('returns bounded help for unsupported free-form questions', () => {
    const answer = answerStatusQuery('write my code for me', intelligence());
    expect(answer.intent).toBe('help');
    expect(answer.answer).toContain('provider routing');
    expect(answer.answer).toContain('next reset');
  });
});
