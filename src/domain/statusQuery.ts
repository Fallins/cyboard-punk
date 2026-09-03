import type { StatusIntelligence } from './statusIntelligence';

export type StatusQueryIntent = 'overview' | 'route' | 'reset' | 'sessions' | 'project' | 'help';

export interface StatusQueryAnswer {
  intent: StatusQueryIntent;
  answer: string;
}

function normalizeQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

export function classifyStatusQuery(query: string): StatusQueryIntent {
  const normalized = normalizeQuery(query);
  if (!normalized) return 'help';

  if (/\breset\b|重置|重設|重啟額度|多久.*(?:reset|重置)/iu.test(normalized)) return 'reset';
  if (/\b(?:agent|agents|session|sessions|running|active)\b|執行中|在執行|幾個.*(?:agent|任務)|工作中/iu.test(normalized)) {
    return 'sessions';
  }
  if (/\b(?:project|projects|token|tokens)\b|專案|項目|最燒|燒.*token/iu.test(normalized)) return 'project';
  if (
    /\b(?:best provider|which provider|recommend|recommended|route|what should i use)\b|哪個.*(?:provider|工具)|用哪|推薦.*(?:provider|工具)/iu.test(
      normalized,
    )
  ) {
    return 'route';
  }
  if (/\b(?:status|overall|overview|how are things)\b|整體|狀態|現在怎樣|目前怎樣/iu.test(normalized)) return 'overview';
  return 'help';
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const leftoverHours = hours % 24;
  return leftoverHours > 0 ? `${days}d ${leftoverHours}h` : `${days}d`;
}

function answerRoute(intelligence: StatusIntelligence): string {
  if (!intelligence.recommendedProvider) {
    return 'No fresh provider quota is available for a routing recommendation right now.';
  }
  return `${intelligence.headline}. ${intelligence.summary}`;
}

function answerReset(intelligence: StatusIntelligence): string {
  const reset = intelligence.nearestReset;
  if (!reset) return 'No future provider reset is currently available from normalized quota evidence.';
  return `${reset.displayName} ${reset.windowLabel} resets in ${formatDuration(reset.minutesUntil)}.`;
}

function answerSessions(intelligence: StatusIntelligence): string {
  if (intelligence.activeSessions === 0) return 'No active coding-agent sessions are currently detected.';
  return `${intelligence.activeSessions} active ${intelligence.activeSessions === 1 ? 'session is' : 'sessions are'} currently detected.`;
}

function answerProject(intelligence: StatusIntelligence): string {
  const project = intelligence.recentProject;
  if (!project) {
    return 'No recent project-attributed request telemetry is available. Cumulative thread totals are not used for this answer.';
  }
  return `${project.project} leads recent project-attributed request activity with ${project.sharePercent}% of measured tokens in the last 24 hours.`;
}

export function answerStatusQuery(query: string, intelligence: StatusIntelligence): StatusQueryAnswer {
  const intent = classifyStatusQuery(query);
  switch (intent) {
    case 'overview':
      return { intent, answer: `${intelligence.headline}. ${intelligence.summary}` };
    case 'route':
      return { intent, answer: answerRoute(intelligence) };
    case 'reset':
      return { intent, answer: answerReset(intelligence) };
    case 'sessions':
      return { intent, answer: answerSessions(intelligence) };
    case 'project':
      return { intent, answer: answerProject(intelligence) };
    case 'help':
      return {
        intent,
        answer: 'I can answer local status questions about provider routing, the next reset, active agents, recent project activity, or overall status.',
      };
  }
}
