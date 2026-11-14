import { formatMoney, webMessages as t } from '@lg/i18n';
import { Card, CardTitle, KpiCard, PageHeader } from '@lg/ui-web';
import type { LessonCell } from './types.js';

export interface WebKpi {
  revenueMonth: bigint;
  revenueDelta: number;
  debtTotal: bigint;
  activeStudents: number;
  attendance: number;
  queue: number;
  unmarked: number;
  joined: number;
  left: number;
  daily: readonly { day: number; amount: bigint }[];
}

/** Kunlik tushum ustunlari (SVG, tokenlar; ECharts — W-26 hisobotlarida). */
function DailyBars({ daily }: { daily: WebKpi['daily'] }) {
  const max = daily.reduce((m, d) => (d.amount > m ? d.amount : m), 1n);
  return (
    <div className="flex h-40 items-end gap-1" role="img" aria-label={t.dashboard.revenueChart}>
      {daily.map((d) => (
        <div key={d.day} className="flex h-full flex-1 flex-col items-center gap-1">
          {/* Ustun maydoni balandligi aniq (flex-1) — foizli balandlik shunga nisbatan. */}
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-sm bg-primary/80"
              // Foiz bigint'da hisoblanadi; Number — faqat 0–100 balandlik (pul emas).
              style={{ height: `${Number((d.amount * 100n) / max)}%` }}
              title={`${d.day}: ${formatMoney(d.amount)}`}
            />
          </div>
          <span className="text-[10px] tabular-nums text-text-muted">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  title: string;
  k: WebKpi;
  lessons: readonly LessonCell[];
  onOpen: (
    target: 'payments' | 'debtors' | 'students' | 'attendance' | 'queue' | 'unmarked',
  ) => void;
}

function KpiRow({ k, onOpen }: Pick<Props, 'k' | 'onOpen'>) {
  const up = k.revenueDelta >= 0;
  return (
    <div className="mb-6 grid grid-cols-3 gap-4 2xl:grid-cols-6">
      <KpiCard
        label={t.dashboard.revenueMonth}
        value={formatMoney(k.revenueMonth)}
        delta={{
          text: t.dashboard.change.replace('{v}', `${up ? '+' : ''}${k.revenueDelta}%`),
          up,
          good: up,
        }}
        onClick={() => onOpen('payments')}
      />
      <KpiCard
        label={t.dashboard.debtTotal}
        value={formatMoney(k.debtTotal)}
        tone="danger"
        onClick={() => onOpen('debtors')}
      />
      <KpiCard
        label={t.dashboard.activeStudents}
        value={k.activeStudents}
        onClick={() => onOpen('students')}
      />
      <KpiCard
        label={t.dashboard.attendance}
        value={`${k.attendance}%`}
        onClick={() => onOpen('attendance')}
      />
      <KpiCard
        label={t.dashboard.queue}
        value={k.queue}
        tone={k.queue ? 'warning' : 'default'}
        onClick={() => onOpen('queue')}
      />
      <KpiCard
        label={t.dashboard.unmarked}
        value={k.unmarked}
        tone={k.unmarked ? 'danger' : 'default'}
        onClick={() => onOpen('unmarked')}
      />
    </div>
  );
}

/** W-04 Bosh sahifa (FR-DASH-1). */
export function DashboardView({ title, k, lessons, onOpen }: Props) {
  return (
    <>
      <PageHeader title={title} />
      <KpiRow k={k} onOpen={onOpen} />
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardTitle className="mb-4 text-base">{t.dashboard.revenueChart}</CardTitle>
          <DailyBars daily={k.daily} />
          <p className="mt-3 text-sm text-text-muted">
            {t.dashboard.flow}: <span className="font-medium text-success">+{k.joined}</span> /{' '}
            <span className="font-medium text-danger">−{k.left}</span>
          </p>
        </Card>
        <Card>
          <CardTitle className="mb-4 text-base">{t.dashboard.todayLessons}</CardTitle>
          <ul className="flex flex-col divide-y divide-border">
            {lessons.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-11 font-medium tabular-nums text-text">{l.start}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-text">{l.group}</span>
                  <span className="truncate text-xs text-text-muted">
                    {l.teacher} · {l.room}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
