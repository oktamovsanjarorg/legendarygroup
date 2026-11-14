import type { StaffInvite } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Card, CardTitle } from '@lg/ui-web';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '../api/client.js';

/**
 * Xodim o'z Telegram'ini bog'laydi (T-120): bot havolasi → raqamni ulashish. Shundan keyin
 * Mini App xodim rejimida ochiladi. Director/Admin'ga bot taklifi avtomatik berilmaydi.
 */
export function TelegramLinkCard() {
  const invite = useMutation({
    mutationFn: () =>
      api.request<StaffInvite>('/staff/me/telegram-invite', { method: 'POST', body: {} }),
  });
  const linked =
    invite.error instanceof ApiError && invite.error.code === 'TELEGRAM_ALREADY_LINKED';
  return (
    <Card className="max-w-3xl">
      <CardTitle>{t.telegramLink.title}</CardTitle>
      <p className="mt-2 text-sm text-text-muted">{t.telegramLink.hint}</p>
      {linked ? (
        <p className="mt-3 text-sm text-success">{t.telegramLink.linked}</p>
      ) : invite.data ? (
        <div className="mt-3 flex flex-col gap-2">
          <a
            className="text-sm font-medium text-primary underline"
            href={invite.data.url}
            target="_blank"
            rel="noreferrer"
          >
            {t.telegramLink.open}
          </a>
          <p className="text-xs text-text-muted">{t.telegramLink.steps}</p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {invite.isError && (
            <p role="alert" className="text-sm text-danger">
              {invite.error instanceof ApiError ? invite.error.message : String(invite.error)}
            </p>
          )}
          <Button size="sm" loading={invite.isPending} onClick={() => invite.mutate()}>
            {t.telegramLink.get}
          </Button>
        </div>
      )}
    </Card>
  );
}
