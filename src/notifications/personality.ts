import type { ProviderId } from '../domain/types';
import type { AppLanguage } from '../i18n/core';
import type { NotificationPersonality } from '../settings/settings';

interface NotificationFactCopy {
  provider: ProviderId;
  title: string;
  body: string;
}

export interface RenderedNotificationCopy {
  title: string;
  body: string;
}

export function renderNotificationCopy(
  alert: NotificationFactCopy,
  personality: NotificationPersonality,
  language: AppLanguage = 'en',
): RenderedNotificationCopy {
  switch (personality) {
    case 'nyx':
      return {
        title: `NYX // ${alert.title}`,
        body: `${language === 'zh-TW' ? 'Operator 提醒' : 'Operator advisory'} · ${alert.body}`,
      };
    case 'minimal':
      return {
        title: `CYBOARD · ${alert.provider.toUpperCase()}`,
        body: alert.body,
      };
    case 'system':
      return { title: alert.title, body: alert.body };
  }
}
