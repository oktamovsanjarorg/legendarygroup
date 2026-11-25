import { formatMoney, miniappMessages as t } from '@lg/i18n';
import { KpiTile, type QuickAction, QuickActions } from '@lg/ui-tg';

export interface StaffKpi {
  revenue: bigint;
  revenueYesterday: bigint;
  attendancePercent: number;
  unmarkedLessons: number;
  absentToday: number;
  queue: number;
  /** Faqat Director (approval.decide). */
  approvals?: number;
}

export type KpiTarget = 'payments' | 'attendance' | 'unmarked' | 'absent' | 'queue' | 'approvals';

/** MS-01 Bugun (FR-DASH-5): ixcham KPI; har ko'rsatkich — tegishli ro'yxatga. */
export function StaffDashboardView({
  k,
  actions = [],
  onOpen,
}: {
  k: StaffKpi;
  /** Tezkor amallar (Q-113): MainButton o'rniga — pastki menyuni siljitmaydi. */
  actions?: readonly QuickAction[];
  onOpen: (target: KpiTarget) => void;
}) {
  return (
    <main className="flex flex-col gap-3 p-2 pt-3 desk:gap-5">
      <h1 className="px-2 text-2xl font-bold text-text desk:px-0">{t.dashboard.title}</h1>
      <QuickActions items={actions} />
      <div className="grid grid-cols-2 gap-2 desk:grid-cols-4 desk:gap-3">
        <div className="col-span-2 grid">
          <KpiTile
            label={t.dashboard.revenue}
            value={formatMoney(k.revenue)}
            note={t.dashboard.vsYesterday.replace('{v}', formatMoney(k.revenueYesterday))}
            onClick={() => onOpen('payments')}
          />
        </div>
        <KpiTile
          label={t.dashboard.attendance}
          value={`${k.attendancePercent}%`}
          onClick={() => onOpen('attendance')}
        />
        <KpiTile
          label={t.dashboard.unmarked}
          value={k.unmarkedLessons}
          tone={k.unmarkedLessons > 0 ? 'danger' : 'default'}
          onClick={() => onOpen('unmarked')}
        />
        <KpiTile
          label={t.dashboard.absentToday}
          value={k.absentToday}
          onClick={() => onOpen('absent')}
        />
        <KpiTile
          label={t.dashboard.queue}
          value={k.queue}
          tone={k.queue > 0 ? 'warning' : 'default'}
          onClick={() => onOpen('queue')}
        />
        {k.approvals !== undefined && (
          <KpiTile
            label={t.dashboard.approvals}
            value={k.approvals}
            tone={k.approvals > 0 ? 'warning' : 'default'}
            onClick={() => onOpen('approvals')}
          />
        )}
      </div>
    </main>
  );
}
