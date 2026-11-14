import { formatMoney, formatTime, webMessages as t } from '@lg/i18n';
import { Button, Card, CardTitle, cn, MoneyField, PageHeader } from '@lg/ui-web';

export interface CashDay {
  date: string;
  /** Tizim bo'yicha naqd (server hisoblagan). */
  expected: bigint;
  payments: readonly { time: Date; student: string; amount: bigint; receipt: string }[];
  closed?: { at: Date; by: string };
}

function PaymentsCard({ payments }: { payments: CashDay['payments'] }) {
  return (
    <Card className="col-span-3">
      <CardTitle className="mb-3 text-base">{t.cash.payments}</CardTitle>
      <ul className="divide-y divide-border text-sm">
        {payments.map((p) => (
          <li key={p.receipt} className="flex justify-between py-2">
            <span>
              <span className="tabular-nums text-text-muted">{formatTime(p.time)}</span> ·{' '}
              {p.student} · <span className="text-text-muted">{p.receipt}</span>
            </span>
            <span className="tabular-nums">{formatMoney(p.amount)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

interface Props {
  day: CashDay;
  counted: bigint | null;
  /** Farq = sanalgan − kutilgan; serverdan (preview) yoki forma hisobi — bigint. */
  diff: bigint | null;
  note: string;
  onCounted: (v: bigint | null) => void;
  onNote: (s: string) => void;
  onClose: () => void;
}

/** W-16 Kassa (FR-PAY-10): kunlik yopish — kutilgan vs sanalgan, farq bo'lsa izoh majburiy. */
export function CashView({ day, counted, diff, note, onCounted, onNote, onClose }: Props) {
  const needNote = diff !== null && diff !== 0n;
  return (
    <>
      <PageHeader title={t.cash.title} description={day.date} />
      <div className="grid grid-cols-5 gap-6">
        <Card className="col-span-2 flex flex-col gap-4">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">{t.cash.expected}</span>
            <span className="text-lg font-semibold tabular-nums text-text">
              {formatMoney(day.expected)}
            </span>
          </div>
          <MoneyField label={t.cash.counted} value={counted} onChange={onCounted} />
          {diff !== null && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">{t.cash.diff}</span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  diff === 0n ? 'text-success' : 'text-danger',
                )}
              >
                {formatMoney(diff)}
              </span>
            </div>
          )}
          {needNote && (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
              {t.cash.diffNote}
              <textarea
                value={note}
                onChange={(e) => onNote(e.target.value)}
                rows={3}
                className="rounded-md border border-border bg-bg p-3 text-sm outline-none focus:border-primary"
              />
            </label>
          )}
          {day.closed ? (
            <p className="text-sm text-success">
              {t.cash.closed
                .replace('{time}', formatTime(day.closed.at))
                .replace('{name}', day.closed.by)}
            </p>
          ) : (
            <Button
              onClick={onClose}
              disabled={counted === null || (needNote && note.trim().length < 3)}
            >
              {t.cash.close}
            </Button>
          )}
        </Card>
        <PaymentsCard payments={day.payments} />
      </div>
    </>
  );
}
