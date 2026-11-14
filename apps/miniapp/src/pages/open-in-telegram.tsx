import { miniappMessages as t } from '@lg/i18n';
import { StateShell } from '@lg/ui-tg';
import { Send } from 'lucide-react';

/** Oddiy brauzerda ochilganda (initData yo'q) — TelegramProvider'siz. */
export function OpenInTelegramPage() {
  return (
    <StateShell
      icon={<Send className="size-10" aria-hidden />}
      title={t.openInTelegram.title}
      hint={t.openInTelegram.hint}
    />
  );
}
