import { formatTime, miniappMessages as t } from '@lg/i18n';
import { EmptyState, ListItem, Section, useMainButton } from '@lg/ui-tg';
import { CloudOff } from 'lucide-react';

export interface QueuedAttendance {
  id: string;
  groupName: string;
  lessonAt: Date;
  lastAttemptAt: Date;
}

interface Props {
  items: readonly QueuedAttendance[];
  sending?: boolean;
  onSendNow: () => void;
}

/** MT-03 offline navbat (FR-ATT-6): sinxronlanmagan davomatlar; tarmoq qaytsa avtomatik. */
export function OfflineQueueView({ items, sending, onSendNow }: Props) {
  useMainButton({
    text: t.offlineQueue.sendNow,
    onClick: onSendNow,
    loading: sending,
    visible: items.length > 0,
  });
  if (items.length === 0)
    return <EmptyState title={t.offlineQueue.empty} hint={t.offlineQueue.emptyHint} />;
  return (
    <main className="flex flex-col gap-3 p-2 pt-3">
      <h1 className="px-2 text-xl font-semibold text-text">{t.offlineQueue.title}</h1>
      <Section>
        {items.map((q) => (
          <ListItem
            key={q.id}
            before={<CloudOff className="size-5 text-warning" aria-hidden />}
            title={`${q.groupName} · ${formatTime(q.lessonAt)}`}
            subtitle={t.offlineQueue.lastAttempt.replace('{time}', formatTime(q.lastAttemptAt))}
          />
        ))}
      </Section>
    </main>
  );
}
