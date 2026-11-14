import { formatMoney, formatTime, miniappMessages as m, webMessages as t } from '@lg/i18n';
import { Badge, Button, Card, cn, EmptyState, MoneyField, PageHeader } from '@lg/ui-web';
import { AlertTriangle, Info } from 'lucide-react';

export interface WebQueueItem {
  id: string;
  imageUrl: string;
  student: string;
  group: string;
  guardian: string;
  amount: bigint;
  sentAt: Date;
  comment?: string;
  /** 24 soatdan oshgan (BR-13 — Direktorga eslatma). */
  overdue?: boolean;
  duplicate?: string;
}

interface Props {
  items: readonly WebQueueItem[];
  selected: string | null;
  amount: bigint | null;
  onSelect: (id: string) => void;
  onAmount: (v: bigint | null) => void;
  onApprove: () => void;
  onReject: () => void;
}

/** Chap ro'yxat elementi. */
function QueueRow({ q, on, onSelect }: { q: WebQueueItem; on: boolean; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={on ? 'true' : undefined}
        className={cn(
          'flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left text-sm',
          on ? 'bg-primary/10' : 'hover:bg-surface',
        )}
      >
        <span className="flex justify-between">
          <span className="font-medium text-text">{q.student}</span>
          <span className="tabular-nums text-text">{formatMoney(q.amount)}</span>
        </span>
        <span className="flex justify-between text-xs text-text-muted">
          {q.group} · {formatTime(q.sentAt)}
          {q.overdue && <Badge tone="danger">{t.queueWeb.overdue}</Badge>}
        </span>
      </button>
    </li>
  );
}

type DetailProps = Pick<Props, 'amount' | 'onAmount' | 'onApprove' | 'onReject'> & {
  cur: WebQueueItem;
};

function DetailCard({ cur, amount, onAmount, onApprove, onReject }: DetailProps) {
  const p = { amount, onAmount, onApprove, onReject };
  return (
    <Card className="grid grid-cols-2 gap-6">
      <img
        src={cur.imageUrl}
        alt={cur.student}
        className="max-h-[32rem] w-full rounded-md bg-surface object-contain"
      />
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text">{cur.student}</h2>
          <p className="text-sm text-text-muted">
            {cur.group} · {cur.guardian}
          </p>
          {cur.comment && (
            <p className="mt-2 text-sm text-text">
              {m.review.comment.replace('{text}', cur.comment)}
            </p>
          )}
        </div>
        {cur.duplicate && (
          <p className="flex gap-2 rounded-md bg-warning-bg p-3 text-sm text-warning">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {cur.duplicate}
          </p>
        )}
        <MoneyField label={m.review.amount} value={p.amount} onChange={p.onAmount} />
        <p className="flex gap-2 text-sm text-text-muted">
          <Info className="size-4 shrink-0" aria-hidden />
          {m.review.bankReminder}
        </p>
        <span className="mt-auto flex justify-end gap-2">
          <Button variant="danger" onClick={p.onReject}>
            {m.review.reject}
          </Button>
          <Button onClick={p.onApprove} disabled={p.amount === null}>
            {m.review.approve}
          </Button>
        </span>
      </div>
    </Card>
  );
}

/** W-14 Chek navbati (FR-PAY-4/5): MS-02 ning keng varianti — ro'yxat + katta rasm + qaror. */
export function WebQueueView(p: Props) {
  const cur = p.items.find((q) => q.id === p.selected);
  return (
    <>
      <PageHeader
        title={t.queueWeb.title}
        description={t.queueWeb.waiting.replace('{n}', String(p.items.length))}
      />
      {p.items.length === 0 ? (
        <EmptyState title={m.review.empty} />
      ) : (
        <div className="grid grid-cols-[20rem_1fr] gap-6">
          <ul className="overflow-hidden rounded-lg border border-border bg-bg">
            {p.items.map((q) => (
              <QueueRow
                key={q.id}
                q={q}
                on={q.id === p.selected}
                onSelect={() => p.onSelect(q.id)}
              />
            ))}
          </ul>
          {cur && (
            <DetailCard
              cur={cur}
              amount={p.amount}
              onAmount={p.onAmount}
              onApprove={p.onApprove}
              onReject={p.onReject}
            />
          )}
        </div>
      )}
    </>
  );
}
