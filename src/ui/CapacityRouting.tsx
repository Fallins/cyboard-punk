import { Show } from 'solid-js';
import { rankProvidersByQuotaHeadroom } from '../domain/capacityRouting';
import type { ProviderSnapshot } from '../domain/types';

interface CapacityRoutingProps {
  snapshots: ProviderSnapshot[];
}

export default function CapacityRouting(props: CapacityRoutingProps) {
  const routing = () => rankProvidersByQuotaHeadroom(props.snapshots);
  const recommended = () => routing().recommended;

  return (
    <section class="capacity-routing" aria-label="Capacity routing recommendation">
      <div>
        <p class="eyebrow">CAPACITY ROUTING</p>
        <Show
          when={recommended()}
          fallback={
            <>
              <strong class="capacity-routing__provider">NO FRESH ROUTE</strong>
              <span class="capacity-routing__detail">Waiting for fresh quota data</span>
            </>
          }
        >
          {(candidate) => (
            <>
              <strong class="capacity-routing__provider">{candidate().displayName}</strong>
              <span class="capacity-routing__detail">
                {candidate().remainingPercent.toFixed(0)}% headroom · constrained by {candidate().constrainedWindowLabel}
              </span>
            </>
          )}
        </Show>
      </div>
      <span class="capacity-routing__scope">QUOTA HEADROOM ONLY</span>
    </section>
  );
}
