import { miniappMessages as t } from '@lg/i18n';
import { PassiveControls } from '@lg/ui-tg';
import { Outlet } from '@tanstack/react-router';
import { MousePointerClick } from 'lucide-react';
import { useState } from 'react';
import { StaffApprovalsPage, StaffSearchPage } from './pages/staff.js';
import { StaffAnnouncementsPage } from './pages/staff-announcements.js';
import { StaffDebtorsPage } from './pages/staff-debtors.js';
import { StaffGroupsPage } from './pages/staff-groups.js';
import { StaffLeadsPage } from './pages/staff-leads.js';
import { StaffPaymentsPage } from './pages/staff-payments.js';
import { StaffPeoplePage } from './pages/staff-people.js';
import { StaffTicketsPage } from './pages/staff-tickets.js';

interface Split {
  list: string;
  List: () => React.JSX.Element;
  /** Shu prefiks bilan boshlanadigan ekranlar o'ng panelda ochiladi. */
  details: readonly string[];
}

/** Keng ekranda ro'yxat + tafsilot (T-164): qaysi ro'yxat qaysi ekranlar bilan yonma-yon. */
export const SPLITS: readonly Split[] = [
  { list: '/staff/search', List: StaffSearchPage, details: ['/staff/student/'] },
  { list: '/staff/debtors', List: StaffDebtorsPage, details: ['/staff/student/'] },
  {
    list: '/staff/payments',
    List: StaffPaymentsPage,
    details: ['/staff/payments/', '/staff/student/'],
  },
  { list: '/staff/leads', List: StaffLeadsPage, details: ['/staff/leads/'] },
  { list: '/staff/approvals', List: StaffApprovalsPage, details: ['/staff/approvals/'] },
  { list: '/staff/groups', List: StaffGroupsPage, details: ['/staff/groups/'] },
  { list: '/staff/tickets', List: StaffTicketsPage, details: ['/staff/tickets/'] },
  { list: '/staff/people', List: StaffPeoplePage, details: ['/staff/people/'] },
  {
    list: '/staff/announcements',
    List: StaffAnnouncementsPage,
    details: ['/staff/announcements/'],
  },
];

const opens = (s: Split, path: string) => s.details.some((d) => path.startsWith(d));

/**
 * Joriy yo'l uchun split: ro'yxatning o'zi yoki uning tafsiloti. Tafsilotda chap panel — oxirgi
 * ochilgan mos ro'yxat (qarzdorlardan kelgan bo'lsa — qarzdorlar), aks holda birinchi mosi.
 */
export function resolveSplit(
  path: string,
  last: Split | null,
): { split: Split; detail: boolean } | null {
  const own = SPLITS.find((s) => s.list === path);
  if (own) return { split: own, detail: false };
  if (last && opens(last, path)) return { split: last, detail: true };
  const first = SPLITS.find((s) => opens(s, path));
  return first ? { split: first, detail: true } : null;
}

export function useSplit(path: string) {
  const [last, setLast] = useState<Split | null>(null);
  const r = resolveSplit(path, last);
  if (r && r.split !== last) setLast(r.split);
  return r;
}

/** Chapda ro'yxat (tafsilotda — Telegram tugmalari passiv), o'ngda tafsilot yoki ko'rsatma. */
export function SplitView({ split, detail }: { split: Split; detail: boolean }) {
  const { List } = split;
  return (
    <div className="flex min-h-screen">
      <section
        aria-label={t.split.list}
        className="sticky top-0 h-screen w-96 shrink-0 overflow-y-auto border-r border-border"
      >
        <PassiveControls active={detail}>
          <List key={split.list} />
        </PassiveControls>
      </section>
      <div className="min-w-0 flex-1">
        {detail ? (
          <div className="mx-auto max-w-3xl">
            <Outlet />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-text-muted">
            <MousePointerClick className="size-10" aria-hidden />
            <p>{t.split.pick}</p>
          </div>
        )}
      </div>
    </div>
  );
}
