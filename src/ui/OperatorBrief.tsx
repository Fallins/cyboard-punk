import { For, Show } from 'solid-js';
import type { StatusIntelligence } from '../domain/statusIntelligence';

const MAX_VISIBLE_SIGNALS = 3;

export default function OperatorBrief(props: { intelligence: StatusIntelligence }) {
  const signals = () => props.intelligence.signals.slice(0, MAX_VISIBLE_SIGNALS);

  return (
    <section class="operator-brief" data-tone={props.intelligence.tone} aria-live="polite">
      <div class="operator-brief__header">
        <div>
          <p class="eyebrow">STATUS INTELLIGENCE</p>
          <h2>System Brief</h2>
        </div>
        <span class="operator-brief__tone">{props.intelligence.tone.toUpperCase()}</span>
      </div>

      <div class="operator-brief__primary">
        <strong>{props.intelligence.headline}</strong>
        <p>{props.intelligence.summary}</p>
      </div>

      <Show when={signals().length > 0}>
        <div class="operator-brief__signals">
          <For each={signals()}>
            {(signal) => (
              <div class="operator-brief__signal" data-tone={signal.tone}>
                <span class="operator-brief__signal-mark" aria-hidden="true" />
                <div>
                  <strong>{signal.label}</strong>
                  <small>{signal.detail}</small>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </section>
  );
}
