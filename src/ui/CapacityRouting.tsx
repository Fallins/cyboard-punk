import { Show } from 'solid-js';
import { rankProvidersByQuotaHeadroom } from '../domain/capacityRouting';
import type { ProviderSnapshot } from '../domain/types';
import './capacity-routing.css';

interface CapacityRoutingProps {
  snapshots: ProviderSnapshot[];
}

export default function CapacityRouting(props: CapacityRoutingProps) {
  const routing = () => rankProvidersByQuotaHeadroom(props.snapshots);
  const recommended = () => routing().recommended;

  return (
    <section class="capacity-routing" aria-label="Capacity routing recommendation">
      <div class="capacity-routing__copy">
        <div class="capacity-routing__heading">
          <p class="eyebrow">BEST HEADROOM</p>
          <span class="capacity-routing__scope">QUOTA ONLY</span>
        </div>
        <Show
          when={recommended()}
          fallback={
            <>
              <strong class="capacity-routing__provider">NO FRESH ROUTE</strong>
              <span class="capacity-routing__detail">Waiting for fresh quota data</span>
              <div class="capacity-routing__meter capacity-routing__meter--empty" />
            </>
          }
        >
          {(candidate) => (
            <>
              <div class="capacity-routing__result">
                <strong class="capacity-routing__provider">{candidate().displayName}</strong>
                <strong class="capacity-routing__percent">{candidate().remainingPercent.toFixed(0)}%</strong>
              </div>
              <span class="capacity-routing__detail">Constrained by {candidate().constrainedWindowLabel}</span>
              <div class="capacity-routing__meter" aria-label={`${candidate().remainingPercent.toFixed(0)} percent quota headroom`}>
                <span style={{ width: `${candidate().remainingPercent}%` }} />
              </div>
            </>
          )}
        </Show>
      </div>
    </section>
  );
}
