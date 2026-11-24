import type { PublicSettings } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Card, CardTitle } from '@lg/ui-web';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';

/**
 * Telegram'i ulanmagan xodim (eski sessiya bilan kirgan) uchun: bot → raqamni ulashish (Q-98).
 * Bu sessiya yopilsa, panelga faqat Telegram orqali kiriladi.
 */
export function TelegramLinkCard() {
  const pub = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => api.request<PublicSettings>('/settings/public'),
  });
  return (
    <Card className="max-w-3xl">
      <CardTitle>{t.telegramLink.title}</CardTitle>
      <p className="mt-2 text-sm text-text-muted">{t.telegramLink.hint}</p>
      <p className="mt-3 text-sm text-text">{t.telegramLink.steps}</p>
      {pub.data && (
        <a
          className="mt-2 inline-block text-sm font-medium text-primary underline"
          href={pub.data.botUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t.telegramLink.open}
        </a>
      )}
    </Card>
  );
}
