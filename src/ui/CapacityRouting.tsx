import { Show } from 'solid-js';
import { rankProvidersByQuotaHeadroom } from '../domain/capacityRouting';
import type { ProviderSnapshot } from '../domain/types';
import { formatQuotaWindowLabel } from '../i18n/core';
import { useI18n } from '../i18n/context';
import './capacity-routing.css';

interface CapacityRoutingProps {
  snapshots: ProviderSnapshot[];
}

export default function CapacityRouting(props: CapacityRoutingProps) {
  const { t, language } = useI18n();
  const routing = () => rankProvidersByQuotaHeadroom(props.snapshots);
  const recommended = () => routing().recommended;

  return (
    <section
      class="capacity-routing"
      aria-label={language() === 'zh-TW' ? 'Provider 額度推薦' : 'Capacity routing recommendation'}>
      <div class="capacity-routing__copy">
        <div class="capacity-routing__heading">
          <p class="eyebrow">{t('bestHeadroom')}</p>
          <span class="capacity-routing__scope">{t('quotaOnly')}</span>
        </div>
        <Show
          when={recommended()}
          fallback={
            <>
              <strong class="capacity-routing__provider">{t('noFreshRoute')}</strong>
              <span class="capacity-routing__detail">{t('waitingFreshQuota')}</span>
              <div class="capacity-routing__meter capacity-routing__meter--empty" />
            </>
          }>
          {(candidate) => (
            <>
              <div class="capacity-routing__result">
                <strong class="capacity-routing__provider">{candidate().displayName}</strong>
                <strong class="capacity-routing__percent">{candidate().remainingPercent.toFixed(0)}%</strong>
              </div>
              <span class="capacity-routing__detail">
                {t('constrainedBy', {
                  window: formatQuotaWindowLabel(candidate().constrainedWindowLabel, language()),
                })}
              </span>
              <div
                class="capacity-routing__meter"
                aria-label={t('quotaHeadroom', { value: candidate().remainingPercent.toFixed(0) })}>
                <span style={{ width: `${candidate().remainingPercent}%` }} />
              </div>
            </>
          )}
        </Show>
      </div>
    </section>
  );
}
