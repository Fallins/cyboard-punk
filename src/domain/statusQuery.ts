import type { AppLanguage } from '../i18n/core';
import { formatDurationCompact } from '../i18n/core';
import type { ProviderId } from './types';
import type { StatusIntelligence } from './statusIntelligence';

export type StatusQueryIntent = 'overview' | 'route' | 'reset' | 'sessions' | 'project' | 'help';
export type StatusQuickActionIntent = Extract<StatusQueryIntent, 'route' | 'reset' | 'sessions' | 'project'>;

export interface StatusQueryAnswer {
  intent: StatusQueryIntent;
  answer: string;
}

const providerDisplayNames: Record<ProviderId, string> = {
  codex: 'Codex',
  claude: 'Claude Code',
  cursor: 'Cursor',
};

function normalizeQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

export function classifyStatusQuery(query: string): StatusQueryIntent {
  const normalized = normalizeQuery(query);
  if (!normalized) return 'help';

  if (/\breset\b|重置|重設|重啟額度|多久.*(?:reset|重置)/iu.test(normalized)) return 'reset';
  if (/\b(?:agent|agents|session|sessions|running|active)\b|執行中|在執行|幾個.*(?:agent|任務)|工作中/iu.test(normalized)) return 'sessions';
  if (/\b(?:project|projects|token|tokens)\b|專案|項目|最燒|燒.*token/iu.test(normalized)) return 'project';
  if (/\b(?:best provider|which provider|recommend|recommended|route|what should i use)\b|哪個.*(?:provider|工具)|用哪|推薦.*(?:provider|工具)/iu.test(normalized)) return 'route';
  if (/\b(?:status|overall|overview|how are things)\b|整體|狀態|現在怎樣|目前怎樣/iu.test(normalized)) return 'overview';
  return 'help';
}

function answerRoute(intelligence: StatusIntelligence, language: AppLanguage): string {
  if (!intelligence.recommendedProvider) {
    return language === 'zh-TW'
      ? '目前沒有最新額度可提供 Provider 推薦。'
      : 'No fresh provider quota is available for a routing recommendation right now.';
  }
  const provider = providerDisplayNames[intelligence.recommendedProvider];
  return language === 'zh-TW'
    ? `目前推薦 ${provider}；最新額度餘裕最佳。`
    : `Use ${provider}; it has the best fresh quota headroom.`;
}

function answerReset(intelligence: StatusIntelligence, language: AppLanguage): string {
  const reset = intelligence.nearestReset;
  if (!reset) {
    return language === 'zh-TW'
      ? '目前沒有可用的下一次 Provider 重置時間。'
      : 'No future provider reset is currently available from normalized quota evidence.';
  }
  return language === 'zh-TW'
    ? `${reset.displayName} ${reset.windowLabel} ${formatDurationCompact(reset.minutesUntil, language)} 後重置。`
    : `${reset.displayName} ${reset.windowLabel} resets in ${formatDurationCompact(reset.minutesUntil, language)}.`;
}

function answerSessions(intelligence: StatusIntelligence, language: AppLanguage): string {
  if (intelligence.activeSessions === 0) {
    return language === 'zh-TW'
      ? '目前沒有偵測到執行中的 Agent Session。'
      : 'No active coding-agent sessions are currently detected.';
  }
  return language === 'zh-TW'
    ? `目前有 ${intelligence.activeSessions} 個 Agent Session 執行中。`
    : `${intelligence.activeSessions} active ${intelligence.activeSessions === 1 ? 'session is' : 'sessions are'} currently detected.`;
}

function answerProject(intelligence: StatusIntelligence, language: AppLanguage): string {
  const project = intelligence.recentProject;
  if (!project) {
    return language === 'zh-TW'
      ? '目前沒有可可靠歸屬到 Project 的近期 Request 資料；不會拿累積 Thread Token 來猜。'
      : 'No recent project-attributed request telemetry is available. Cumulative thread totals are not used for this answer.';
  }
  return language === 'zh-TW'
    ? `近 24H Request 以 ${project.project} 為主，占可歸屬 Token 的 ${project.sharePercent}%。`
    : `${project.project} leads recent project-attributed request activity with ${project.sharePercent}% of measured tokens in the last 24 hours.`;
}

export function answerStatusIntent(
  intent: StatusQueryIntent,
  intelligence: StatusIntelligence,
  language: AppLanguage = 'en',
): StatusQueryAnswer {
  switch (intent) {
    case 'overview':
      return {
        intent,
        answer: language === 'zh-TW'
          ? `${intelligence.headline}。${intelligence.summary}`
          : `${intelligence.headline}. ${intelligence.summary}`,
      };
    case 'route':
      return { intent, answer: answerRoute(intelligence, language) };
    case 'reset':
      return { intent, answer: answerReset(intelligence, language) };
    case 'sessions':
      return { intent, answer: answerSessions(intelligence, language) };
    case 'project':
      return { intent, answer: answerProject(intelligence, language) };
    case 'help':
      return {
        intent,
        answer: language === 'zh-TW'
          ? '可以查看推薦 Provider、下次重置、Active Agent、近期 Project 或整體狀態。'
          : 'I can report local status for provider routing, the next reset, active agents, recent project activity, or overall status.',
      };
  }
}

export function answerStatusQuery(
  query: string,
  intelligence: StatusIntelligence,
  language: AppLanguage = 'en',
): StatusQueryAnswer {
  return answerStatusIntent(classifyStatusQuery(query), intelligence, language);
}
