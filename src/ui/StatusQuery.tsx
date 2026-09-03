import { For, Show, createMemo, createSignal } from 'solid-js';
import type { StatusIntelligence } from '../domain/statusIntelligence';
import { answerStatusQuery } from '../domain/statusQuery';
import { useI18n } from '../i18n/context';

const EN_SUGGESTIONS = [
  { key: 'bestProvider' as const, query: 'Which provider should I use?' },
  { key: 'nextReset' as const, query: 'What resets next?' },
  { key: 'activeAgents' as const, query: 'How many agents are active?' },
  { key: 'recentProject' as const, query: 'Which recent project used the most request tokens?' },
];

const ZH_SUGGESTIONS = [
  { key: 'bestProvider' as const, query: '現在推薦哪個 Provider？' },
  { key: 'nextReset' as const, query: '下一個重置是什麼時候？' },
  { key: 'activeAgents' as const, query: '目前有幾個 Agent 在執行？' },
  { key: 'recentProject' as const, query: '近期哪個 Project 用最多 Token？' },
];

export default function StatusQuery(props: { intelligence: StatusIntelligence }) {
  const { t, language } = useI18n();
  const [query, setQuery] = createSignal('');
  const [submittedQuery, setSubmittedQuery] = createSignal<string | null>(null);
  const result = createMemo(() => {
    const current = submittedQuery();
    return current ? answerStatusQuery(current, props.intelligence, language()) : null;
  });
  const suggestions = () => language() === 'zh-TW' ? ZH_SUGGESTIONS : EN_SUGGESTIONS;

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    const current = query().trim();
    if (current) setSubmittedQuery(current);
  };

  const ask = (nextQuery: string) => {
    setQuery(nextQuery);
    setSubmittedQuery(nextQuery);
  };

  return (
    <section class="status-query-panel" aria-labelledby="ask-cyboard-title">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">{t('localAssistant')}</p>
          <h2 id="ask-cyboard-title">{t('askCyboard')}</h2>
        </div>
        <span class="section-counter">{t('offlineLogic')}</span>
      </div>

      <form class="status-query-form" aria-label={t('askCyboard')} onSubmit={submit}>
        <label class="sr-only" for="cyboard-status-query">
          {language() === 'zh-TW' ? '詢問 CYBOARD 目前狀態' : 'Ask CYBOARD about current status'}
        </label>
        <input
          id="cyboard-status-query"
          value={query()}
          onInput={(event) => setQuery(event.currentTarget.value)}
          placeholder={t('askPlaceholder')}
          autocomplete="off"
        />
        <button type="submit" disabled={!query().trim()}>{t('ask')}</button>
      </form>

      <div class="status-query-suggestions" aria-label={t('suggestedQuestions')}>
        <For each={suggestions()}>
          {(suggestion) => (
            <button type="button" onClick={() => ask(suggestion.query)}>
              {t(suggestion.key)}
            </button>
          )}
        </For>
      </div>

      <Show
        when={result()}
        fallback={<p class="muted status-query-hint">{t('localAnswerHint')}</p>}>
        {(answer) => (
          <div class="status-query-answer" role="status" aria-live="polite" aria-atomic="true">
            <span>{answer().intent.toUpperCase()}</span>
            <p>{answer().answer}</p>
          </div>
        )}
      </Show>
    </section>
  );
}
