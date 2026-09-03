import { describe, expect, it } from 'vitest';
import { renderNotificationCopy } from './personality';

const alert = {
  provider: 'claude' as const,
  title: 'Claude Code capacity warning',
  body: '5h: 9% remaining · resets 9/3/2026, 5:00:00 PM',
};

describe('notification personality', () => {
  it('keeps system copy unchanged', () => {
    expect(renderNotificationCopy(alert, 'system')).toEqual({ title: alert.title, body: alert.body });
  });

  it('adds NYX framing without changing the measured alert facts', () => {
    const rendered = renderNotificationCopy(alert, 'nyx');
    expect(rendered.title).toBe('NYX // Claude Code capacity warning');
    expect(rendered.body).toBe(`Operator advisory · ${alert.body}`);
    expect(rendered.body).toContain('9% remaining');
  });

  it('uses a compact minimal title while preserving the original factual body', () => {
    const rendered = renderNotificationCopy(alert, 'minimal');
    expect(rendered).toEqual({ title: 'CYBOARD · CLAUDE', body: alert.body });
  });
});
