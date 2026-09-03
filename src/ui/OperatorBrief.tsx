import { For, Show } from 'solid-js';
import type { StatusIntelligence } from '../domain/statusIntelligence';
import { useI18n } from '../i18n/context';

const MAX_VISIBLE_SIGNALS = 3;

export default function OperatorBrief(props: { intelligence: StatusIntelligence; loading?: boolean }) {
  const { t, language } = useI18n();
  const signals = () => props.intelligence.signals.slice(0, MAX_VISIBLE_SIGNALS);
  const tone = () => props.loading ? 'nominal' : props.intelligence.tone;
  const toneLabel = () => {
    if (props.loading) return t('syncing');
    if (language() === 'en') return props.intelligence.tone.toUpperCase();
    switch (props.intelligence.tone) {
      case 'nominal': return '正常';
      case 'advisory': return '注意';
      case 'warning': return '警告';
      case 'offline': return '離線';
    }
  };
  const liveSummary = () => {
    if (props.loading) return language() === 'zh-TW' ? '系統摘要同步中' : 'System brief syncing';
    const spokenTone = language() === 'en' ? props.intelligence.tone : toneLabel();
    return `${spokenTone}: ${props.intelligence.headline}`;
  };

  return (
    <section class="operator-brief" data-tone={tone()} aria-labelledby="system-brief-title">
      <span class="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveSummary()}
      </span>
      <div class="operator-brief__header">
        <div>
          <p class="eyebrow">{t('statusIntelligence')}</p>
          <h2 id="system-brief-title">{t('systemBrief')}</h2>
        </div>
        <span class="operator-brief__tone">{toneLabel()}</span>
      </div>

      <Show
        when={!props.loading}
        fallback={
          <div class="operator-brief__primary">
            <strong>{t('evaluatingSignals')}</strong>
            <p>{t('waitingEvidence')}</p>
          </div>
        }>
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
      </Show>
    </section>
  );
}
