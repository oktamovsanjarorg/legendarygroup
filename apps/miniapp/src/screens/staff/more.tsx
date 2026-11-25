import { miniappMessages as t } from '@lg/i18n';
import { ListItem, Section } from '@lg/ui-tg';
import {
  Banknote,
  BookOpen,
  CalendarDays,
  ChartLine,
  CircleAlert,
  ClipboardCheck,
  DoorOpen,
  FileChartColumn,
  HandCoins,
  IdCard,
  type LucideIcon,
  Link2,
  MailWarning,
  Megaphone,
  MessageCircleQuestion,
  PartyPopper,
  Percent,
  Receipt,
  ReceiptText,
  ScrollText,
  ShoppingCart,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserSearch,
  Wallet,
} from 'lucide-react';
import type { StaffMenuItem, StaffMenuKey, StaffSection } from '../../data/staff-menu.js';

const m = t.staffMore;

const ICONS: Record<StaffMenuKey, LucideIcon> = {
  newStudent: UserPlus,
  pay: Wallet,
  debtors: CircleAlert,
  payments: ReceiptText,
  discounts: Percent,
  queue: Receipt,
  approvals: ClipboardCheck,
  leads: UserSearch,
  linkRequests: Link2,
  groups: Users,
  calendar: CalendarDays,
  attendance: UserCheck,
  courses: BookOpen,
  rooms: DoorOpen,
  holidays: PartyPopper,
  tickets: MessageCircleQuestion,
  announcements: Megaphone,
  undelivered: MailWarning,
  audit: ScrollText,
  cash: Banknote,
  addExpense: ShoppingCart,
  finance: ChartLine,
  payroll: HandCoins,
  reports: FileChartColumn,
  forecasts: TrendingUp,
  people: IdCard,
};

export interface StaffMoreViewProps {
  groups: readonly { section: StaffSection; items: readonly StaffMenuItem[] }[];
  /** Band yonidagi son (navbat, soʻrovlar). */
  counts?: Partial<Record<StaffMenuKey, number>>;
  onOpen: (item: StaffMenuItem) => void;
}

/** MS-06 Koʻproq (T-130): ruxsatga qarab boʻlimlar; qolgani — boshqaruv panelida (MainButton). */
export function StaffMoreView({ groups, counts = {}, onOpen }: StaffMoreViewProps) {
  return (
    <main className="flex flex-col gap-4 p-2 pt-3">
      <h1 className="px-2 text-2xl font-bold text-text">{m.title}</h1>
      {groups.map((g) => (
        <Section key={g.section} title={m.sections[g.section]}>
          {g.items.map((i) => {
            const Icon = ICONS[i.key];
            const n = counts[i.key];
            return (
              <ListItem
                key={i.key}
                before={<Icon className="size-5" aria-hidden />}
                title={m.items[i.key]}
                after={
                  n ? (
                    <span className="rounded-full bg-primary px-2 text-primary-text">{n}</span>
                  ) : undefined
                }
                chevron
                onClick={() => onOpen(i)}
              />
            );
          })}
        </Section>
      ))}
      <p className="px-4 text-sm text-text-muted">{m.panelHint}</p>
    </main>
  );
}
