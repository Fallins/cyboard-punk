import { createContext, useContext, type Accessor, type JSX } from 'solid-js';
import { formatDateTime, formatDurationCompact, type AppLanguage } from './core';

type Vars = Record<string, string | number>;

type CopyKey =
  | 'settings' | 'refresh' | 'syncing' | 'connecting' | 'localMonitor' | 'providersReady'
  | 'providerQuota' | 'used' | 'left' | 'reset' | 'retryAfter' | 'noQuotaSignal' | 'waitingQuota'
  | 'resourceMatrix' | 'activeAgents' | 'sessionRunning' | 'sessionsRunning' | 'providerHealth'
  | 'liveOperations' | 'agentSessions' | 'allAgentsStandby' | 'sessionsAutoAppear'
  | 'systemBrief' | 'statusIntelligence' | 'evaluatingSignals' | 'waitingEvidence'
  | 'bestHeadroom' | 'quotaOnly' | 'noFreshRoute' | 'waitingFreshQuota' | 'constrainedBy'
  | 'tokenActivity' | 'tokenTelemetry' | 'sources' | 'noData' | 'usageUnavailable'
  | 'modelMix' | 'projectUnavailable' | 'latestActivity' | 'recentCloseouts' | 'observedLifecycle'
  | 'closeoutNote' | 'lastSeen' | 'observed' | 'localAssistant' | 'askCyboard' | 'offlineLogic'
  | 'askPlaceholder' | 'ask' | 'suggestedQuestions' | 'localAnswerHint' | 'bestProvider'
  | 'nextReset' | 'recentProject' | 'overallStatus' | 'quotaTrend' | 'burnRate' | 'lastSamples'
  | 'trendBuilds' | 'quotaUnavailable' | 'openDashboard' | 'opening' | 'commandLink'
  | 'providers' | 'ready' | 'active' | 'quotaSummary' | 'statusSummary' | 'openingDashboard'
  | 'refreshingQuotas' | 'systemConfig' | 'language' | 'languageHelp' | 'experience'
  | 'operator' | 'operatorHelp' | 'nyxTestControls' | 'nyxTestHelp' | 'autoRefresh' | 'autoRefreshHelp'
  | 'quotaNotifications' | 'notificationStyle' | 'notificationStyleHelp' | 'systemStyle' | 'nyxStyle'
  | 'minimalStyle' | 'resetReminder' | 'resetReminderHelp' | 'launchAtLogin' | 'launchAtLoginHelp'
  | 'off' | 'seconds30' | 'minute1' | 'minutes3' | 'minutes5' | 'minutes10' | 'minutes30' | 'hour1'
  | 'closeSettings' | 'enabledProvidersHelp' | 'operatorDisabled' | 'operatorLoading'
  | 'noProviderBridge' | 'providersCount' | 'activeCount' | 'brief' | 'fallback' | 'quotaHeadroom'
  | 'stateIdle' | 'stateObserve' | 'stateProcess' | 'stateWarning' | 'stateSuccess' | 'stateOffline'
  | 'attention' | 'center' | 'motionTuning' | 'resetTuning' | 'nyxRuntimeSimulator';

const en: Record<CopyKey, string> = {
  settings: 'SETTINGS', refresh: 'REFRESH', syncing: 'SYNCING', connecting: 'CONNECTING', localMonitor: 'LOCAL MONITOR', providersReady: '{ready}/{total} PROVIDERS READY',
  providerQuota: 'Provider Quota', used: '{value}% used', left: 'LEFT', reset: 'Reset {time}', retryAfter: 'Retry after {time}', noQuotaSignal: 'NO QUOTA SIGNAL', waitingQuota: 'Waiting for a usable quota snapshot.',
  resourceMatrix: 'RESOURCE MATRIX', activeAgents: 'ACTIVE AGENTS', sessionRunning: 'session running', sessionsRunning: 'sessions running', providerHealth: 'Provider health and live session state',
  liveOperations: 'LIVE OPERATIONS', agentSessions: 'Agent Sessions', allAgentsStandby: 'All agents standing by', sessionsAutoAppear: 'Live coding sessions will appear here automatically.',
  systemBrief: 'System Brief', statusIntelligence: 'STATUS INTELLIGENCE', evaluatingSignals: 'Evaluating provider signals', waitingEvidence: 'Waiting for normalized quota, session and usage evidence before issuing a brief.',
  bestHeadroom: 'BEST HEADROOM', quotaOnly: 'QUOTA ONLY', noFreshRoute: 'NO FRESH ROUTE', waitingFreshQuota: 'Waiting for fresh quota data', constrainedBy: 'Constrained by {window}',
  tokenActivity: 'Token Activity', tokenTelemetry: 'TOKEN TELEMETRY', sources: '{count} SOURCES', noData: 'NO DATA', usageUnavailable: 'Reliable token telemetry will appear here when a provider exposes it.',
  modelMix: 'MODEL MIX', projectUnavailable: 'Project attribution unavailable for these samples.', latestActivity: 'Latest measured activity {time}', recentCloseouts: 'Recent Closeouts', observedLifecycle: 'OBSERVED LIFECYCLE',
  closeoutNote: 'Closeouts require two consecutive usable scans. Times describe observed session presence, not task-content completion.', lastSeen: 'LAST SEEN {time}', observed: 'OBSERVED {duration}',
  localAssistant: 'LOCAL ASSISTANT', askCyboard: 'Ask CYBOARD', offlineLogic: 'OFFLINE LOGIC', askPlaceholder: 'Ask about routing, reset, agents, project activity…', ask: 'ASK', suggestedQuestions: 'Suggested status questions', localAnswerHint: 'Answers are resolved locally from the current normalized CYBOARD snapshot.',
  bestProvider: 'Best provider', nextReset: 'Next reset', recentProject: 'Recent project', overallStatus: 'Overall status', quotaTrend: 'Quota Trend', burnRate: 'BURN RATE', lastSamples: 'LAST 24 SAMPLES', trendBuilds: 'Trend data builds while CYBOARD is running.',
  quotaUnavailable: 'N/A · quota unavailable', openDashboard: 'OPEN DASHBOARD', opening: 'OPENING', commandLink: 'COMMAND LINK', providers: 'PROVIDERS', ready: 'ready', active: 'ACTIVE', quotaSummary: 'Provider quota summary', statusSummary: 'CYBOARD status summary', openingDashboard: 'Opening dashboard', refreshingQuotas: 'Refreshing provider quotas',
  systemConfig: 'SYSTEM CONFIG', language: 'Language', languageHelp: 'Choose the language used across CYBOARD.', experience: 'Experience', operator: 'Operator', operatorHelp: 'Use NYX, switch to the AXON preview, or disable the renderer entirely.', nyxTestControls: 'NYX test controls', nyxTestHelp: 'Show local diagnostics for NYX motion and state testing.', autoRefresh: 'Auto refresh', autoRefreshHelp: 'Native provider throttles still protect upstream endpoints.', quotaNotifications: 'Quota notifications', notificationStyle: 'Notification style', notificationStyleHelp: 'Changes wording only; alert thresholds and timing stay the same.', systemStyle: 'System', nyxStyle: 'NYX', minimalStyle: 'Minimal', resetReminder: 'Reset reminder', resetReminderHelp: 'Notify before a known quota reset while CYBOARD is running.', launchAtLogin: 'Launch at login', launchAtLoginHelp: 'Start CYBOARD with macOS and keep it available from the menu bar.', off: 'Off', seconds30: '30S', minute1: '1M', minutes3: '3M', minutes5: '5M', minutes10: '10M', minutes30: '30M', hour1: '1H', closeSettings: 'Close settings', enabledProvidersHelp: 'Only enabled providers appear in quota, routing, trend, session and notification surfaces.', operatorDisabled: 'CYBOARD operator disabled', operatorLoading: 'CYBOARD operator loading', noProviderBridge: 'Native provider bridge unavailable. Launch CYBOARD through the Tauri desktop shell.', providersCount: '{count} PROVIDERS', activeCount: '{count} ACTIVE', brief: 'BRIEF', fallback: 'FALLBACK', quotaHeadroom: '{value} percent quota headroom',
  stateIdle: 'IDLE', stateObserve: 'OBSERVE', stateProcess: 'PROCESS', stateWarning: 'WARNING', stateSuccess: 'SUCCESS', stateOffline: 'OFFLINE', attention: 'ATTENTION', center: 'CENTER', motionTuning: 'NYX motion tuning', resetTuning: 'RESET TUNING', nyxRuntimeSimulator: 'NYX runtime state simulator',
};

const zh: Record<CopyKey, string> = {
  settings: '設定', refresh: '更新', syncing: '同步中', connecting: '連線中', localMonitor: '本機監控', providersReady: '{ready}/{total} PROVIDER 就緒',
  providerQuota: 'Provider 額度', used: '已用 {value}%', left: '剩餘', reset: '{time} 重置', retryAfter: '{time} 後重試', noQuotaSignal: '無額度資料', waitingQuota: '等待可用額度資料。',
  resourceMatrix: '資源狀態', activeAgents: 'ACTIVE AGENTS', sessionRunning: '個 Session 執行中', sessionsRunning: '個 Session 執行中', providerHealth: 'Provider 狀態與即時 Session',
  liveOperations: '即時作業', agentSessions: 'Agent Sessions', allAgentsStandby: '所有 Agent 待命', sessionsAutoAppear: '有執行中的 Session 時會自動顯示。',
  systemBrief: '系統摘要', statusIntelligence: '狀態判斷', evaluatingSignals: '正在分析 Provider', waitingEvidence: '等待額度、Session 與 Usage 資料。',
  bestHeadroom: '最佳餘裕', quotaOnly: '僅額度', noFreshRoute: '暫無推薦', waitingFreshQuota: '等待最新額度', constrainedBy: '受 {window} 限制',
  tokenActivity: 'Token Activity', tokenTelemetry: 'TOKEN 資料', sources: '{count} 個來源', noData: '無資料', usageUnavailable: 'Provider 提供可靠 Token 資料後會顯示於此。',
  modelMix: 'MODEL MIX', projectUnavailable: '此資料無可靠 Project 歸屬。', latestActivity: '最近活動 {time}', recentCloseouts: '最近結束', observedLifecycle: 'SESSION 追蹤',
  closeoutNote: '連續兩次掃描都未發現才視為結束；時間只代表觀測到的 Session。', lastSeen: '最後出現 {time}', observed: '觀測 {duration}',
  localAssistant: '本機助手', askCyboard: '詢問 CYBOARD', offlineLogic: '本機判斷', askPlaceholder: '詢問推薦、重置、Agent、Project…', ask: '詢問', suggestedQuestions: '建議問題', localAnswerHint: '答案只使用目前 CYBOARD 的本機標準化資料。',
  bestProvider: '推薦 Provider', nextReset: '下次重置', recentProject: '近期 Project', overallStatus: '整體狀態', quotaTrend: '額度趨勢', burnRate: '消耗趨勢', lastSamples: '最近 24 筆', trendBuilds: 'CYBOARD 執行後會逐步累積趨勢資料。',
  quotaUnavailable: 'N/A · 無額度資料', openDashboard: '開啟 Dashboard', opening: '開啟中', commandLink: '快速面板', providers: 'PROVIDERS', ready: '就緒', active: 'ACTIVE', quotaSummary: 'Provider 額度摘要', statusSummary: 'CYBOARD 狀態摘要', openingDashboard: '正在開啟 Dashboard', refreshingQuotas: '正在更新 Provider 額度',
  systemConfig: '系統設定', language: '語言', languageHelp: '切換 CYBOARD 顯示語言。', experience: '體驗', operator: 'Operator', operatorHelp: '使用 NYX、AXON 預覽，或關閉 Operator。', nyxTestControls: 'NYX 測試控制', nyxTestHelp: '顯示 NYX 動作與狀態診斷。', autoRefresh: '自動更新', autoRefreshHelp: 'Provider 端仍有節流保護。', quotaNotifications: '額度通知', notificationStyle: '通知風格', notificationStyleHelp: '只改文案，不改門檻與通知時間。', systemStyle: '系統', nyxStyle: 'NYX', minimalStyle: '極簡', resetReminder: '重置提醒', resetReminderHelp: '已知額度即將重置時提前通知。', launchAtLogin: '開機啟動', launchAtLoginHelp: '登入 macOS 後自動啟動 CYBOARD。', off: '關閉', seconds30: '30S', minute1: '1M', minutes3: '3M', minutes5: '5M', minutes10: '10M', minutes30: '30M', hour1: '1H', closeSettings: '關閉設定', enabledProvidersHelp: '只有啟用的 Provider 會出現在額度、推薦、趨勢、Session 與通知。', operatorDisabled: 'CYBOARD Operator 已關閉', operatorLoading: 'CYBOARD Operator 載入中', noProviderBridge: '無法連接 Native Provider；請從 Tauri App 啟動 CYBOARD。', providersCount: '{count} 個 PROVIDER', activeCount: '{count} ACTIVE', brief: '摘要', fallback: '備援', quotaHeadroom: '額度餘裕 {value}%',
  stateIdle: '待命', stateObserve: '觀察', stateProcess: '處理', stateWarning: '警告', stateSuccess: '完成', stateOffline: '離線', attention: '焦點', center: '中央', motionTuning: 'NYX 動作調整', resetTuning: '重設調整', nyxRuntimeSimulator: 'NYX 狀態模擬器',
};

function interpolate(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => String(vars[key] ?? `{${key}}`));
}

export interface I18nApi {
  language: Accessor<AppLanguage>;
  t: (key: CopyKey, vars?: Vars) => string;
  dateTime: (value: string | Date) => string;
  duration: (minutes: number) => string;
}

const defaultLanguage: Accessor<AppLanguage> = () => 'en';
const defaultApi: I18nApi = {
  language: defaultLanguage,
  t: (key, vars) => interpolate(en[key], vars),
  dateTime: (value) => formatDateTime(value, 'en'),
  duration: formatDurationCompact,
};

const I18nContext = createContext<I18nApi>(defaultApi);

export function I18nProvider(props: { language: AppLanguage; children: JSX.Element }) {
  const language: Accessor<AppLanguage> = () => props.language;
  const api: I18nApi = {
    language,
    t: (key, vars) => interpolate((language() === 'zh-TW' ? zh : en)[key], vars),
    dateTime: (value) => formatDateTime(value, language()),
    duration: formatDurationCompact,
  };
  return <I18nContext.Provider value={api}>{props.children}</I18nContext.Provider>;
}

export function useI18n(): I18nApi {
  return useContext(I18nContext);
}
