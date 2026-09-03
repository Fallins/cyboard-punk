import { For, Show } from 'solid-js';
import type { SessionCloseout } from '../domain/sessionCloseout';
import type { AppLanguage } from '../i18n/core';
import { useI18n } from '../i18n/context';

const MAX_VISIBLE_CLOSEOUTS = 6;

export function formatObservedDuration(minutes: number | undefined, language: AppLanguage = 'en'): string {
  const minute = language === 'zh-TW' ? 'M' : 'm';
  const hour = language === 'zh-TW' ? 'H' : 'h';
  if (minutes === undefined || !Number.isFinite(minutes) || minutes < 1) return `<1${minute}`;
  if (minutes < 60) return `${Math.floor(minutes)}${minute}`;
  const hours = Math.floor(minutes / 60);
  const remainder = Math.floor(minutes % 60);
  return remainder > 0 ? `${hours}${hour} ${remainder}${minute}` : `${hours}${hour}`;
}

export default function SessionCloseouts(props: { closeouts: SessionCloseout[] }) {
  const { t, dateTime, language } = useI18n();
  const visible = () => props.closeouts.slice(0, MAX_VISIBLE_CLOSEOUTS);

  return (
    <Show when={visible().length > 0}>
      <div class="session-closeouts" role="region" aria-labelledby="recent-closeouts-title">
        <span class="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {language() === 'zh-TW'
            ? `${visible().length} 個最近結束的 Session`
            : `${visible().length} recent session ${visible().length === 1 ? 'closeout' : 'closeouts'}`}
        </span>
        <div class="session-closeouts__heading">
          <div>
            <p class="eyebrow">{t('observedLifecycle')}</p>
            <strong id="recent-closeouts-title">{t('recentCloseouts')}</strong>
          </div>
          <span>{visible().length} {language() === 'zh-TW' ? '筆' : 'RECENT'}</span>
        </div>
        <div class="session-closeouts__list">
          <For each={visible()}>
            {(closeout) => (
              <div class="session-closeout-row">
                <div>
                  <strong>{closeout.displayName}</strong>
                  <span>{closeout.project ?? (language() === 'zh-TW' ? '未知 Project' : 'Unknown project')}</span>
                </div>
                <div class="session-closeout-row__meta">
                  <span>{t('observed', { duration: formatObservedDuration(closeout.observedActiveMinutes, language()) })}</span>
                  <small>{t('lastSeen', { time: dateTime(closeout.lastSeenAt) })}</small>
                </div>
              </div>
            )}
          </For>
        </div>
        <p class="muted session-closeouts__note">{t('closeoutNote')}</p>
      </div>
    </Show>
  );
}
