import { For, Show } from 'solid-js';
import type { SessionCloseout } from '../domain/sessionCloseout';

const MAX_VISIBLE_CLOSEOUTS = 6;

export function formatObservedDuration(minutes: number | undefined): string {
  if (minutes === undefined || !Number.isFinite(minutes) || minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = Math.floor(minutes % 60);
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export default function SessionCloseouts(props: { closeouts: SessionCloseout[] }) {
  const visible = () => props.closeouts.slice(0, MAX_VISIBLE_CLOSEOUTS);

  return (
    <Show when={visible().length > 0}>
      <div class="session-closeouts" aria-label="Recent session closeouts">
        <div class="session-closeouts__heading">
          <div>
            <p class="eyebrow">OBSERVED LIFECYCLE</p>
            <strong>Recent Closeouts</strong>
          </div>
          <span>{visible().length} RECENT</span>
        </div>
        <div class="session-closeouts__list">
          <For each={visible()}>
            {(closeout) => (
              <div class="session-closeout-row">
                <div>
                  <strong>{closeout.displayName}</strong>
                  <span>{closeout.project ?? 'Unknown project'}</span>
                </div>
                <div class="session-closeout-row__meta">
                  <span>OBSERVED {formatObservedDuration(closeout.observedActiveMinutes)}</span>
                  <small>LAST SEEN {new Date(closeout.lastSeenAt).toLocaleString()}</small>
                </div>
              </div>
            )}
          </For>
        </div>
        <p class="muted session-closeouts__note">
          Closeouts require two consecutive usable scans. Times describe observed session presence, not task-content completion.
        </p>
      </div>
    </Show>
  );
}
