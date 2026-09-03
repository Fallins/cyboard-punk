import { For, Show, createMemo, createSignal } from 'solid-js';
import type { StatusIntelligence } from '../domain/statusIntelligence';
import { answerStatusQuery } from '../domain/statusQuery';

const SUGGESTIONS = [
  { label: 'Best provider', query: 'Which provider should I use?' },
  { label: 'Next reset', query: 'What resets next?' },
  { label: 'Active agents', query: 'How many agents are active?' },
  { label: 'Recent project', query: 'Which recent project used the most request tokens?' },
] as const;

export default function StatusQuery(props: { intelligence: StatusIntelligence }) {
  const [query, setQuery] = createSignal('');
  const [submittedQuery, setSubmittedQuery] = createSignal<string | null>(null);
  const result = createMemo(() => {
    const current = submittedQuery();
    return current ? answerStatusQuery(current, props.intelligence) : null;
  });

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
    <section class="status-query-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">LOCAL ASSISTANT</p>
          <h2>Ask CYBOARD</h2>
        </div>
        <span class="section-counter">OFFLINE LOGIC</span>
      </div>

      <form class="status-query-form" aria-label="Ask CYBOARD" onSubmit={submit}>
        <label class="sr-only" for="cyboard-status-query">Ask CYBOARD about current status</label>
        <input
          id="cyboard-status-query"
          value={query()}
          onInput={(event) => setQuery(event.currentTarget.value)}
          placeholder="Ask about routing, reset, agents, project activity…"
          autocomplete="off"
        />
        <button type="submit" disabled={!query().trim()}>ASK</button>
      </form>

      <div class="status-query-suggestions" aria-label="Suggested status questions">
        <For each={SUGGESTIONS}>
          {(suggestion) => (
            <button type="button" onClick={() => ask(suggestion.query)}>
              {suggestion.label}
            </button>
          )}
        </For>
      </div>

      <Show
        when={result()}
        fallback={<p class="muted status-query-hint">Answers are resolved locally from the current normalized CYBOARD snapshot.</p>}>
        {(answer) => (
          <div class="status-query-answer" role="status" aria-live="polite">
            <span>{answer().intent.toUpperCase()}</span>
            <p>{answer().answer}</p>
          </div>
        )}
      </Show>
    </section>
  );
}
