import { miniappMessages as t } from '@lg/i18n';
import { ListItem, Section } from '@lg/ui-tg';
import {
  Bell,
  CalendarDays,
  CalendarX,
  MessageCircle,
  MessageSquareHeart,
  Settings,
} from 'lucide-react';

export type MoreTarget =
  'absence' | 'tickets' | 'schedule' | 'notifications' | 'settings' | 'feedback';

const ITEMS: { key: MoreTarget; label: string; icon: typeof Bell }[] = [
  { key: 'absence', label: t.more.absence, icon: CalendarX },
  { key: 'tickets', label: t.more.tickets, icon: MessageCircle },
  { key: 'schedule', label: t.more.schedule, icon: CalendarDays },
];
const SETTINGS: typeof ITEMS = [
  { key: 'notifications', label: t.more.notifications, icon: Bell },
  { key: 'settings', label: t.more.settings, icon: Settings },
  { key: 'feedback', label: t.more.feedback, icon: MessageSquareHeart },
];

/** MG-11 Ko'proq (4-tab, 11-ux §2): MG-08, MG-09, MG-10, bildirishnomalar (C-04), C-05. */
export function MoreView({
  onOpen,
  openTickets,
}: {
  onOpen: (k: MoreTarget) => void;
  openTickets?: number;
}) {
  const row = (i: (typeof ITEMS)[number]) => (
    <ListItem
      key={i.key}
      before={<i.icon className="size-5" aria-hidden />}
      title={i.label}
      after={
        i.key === 'tickets' && openTickets ? (
          <span className="rounded-full bg-primary px-2 text-primary-text">{openTickets}</span>
        ) : undefined
      }
      chevron
      onClick={() => onOpen(i.key)}
    />
  );
  return (
    <main className="flex flex-col gap-4 p-2 pt-3">
      <h1 className="px-2 text-2xl font-bold text-text">{t.more.title}</h1>
      <Section>{ITEMS.map(row)}</Section>
      <Section>{SETTINGS.map(row)}</Section>
    </main>
  );
}
