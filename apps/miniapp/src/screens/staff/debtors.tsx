import { DEBTOR_BUCKETS, type DebtorBucket, type DebtorItem } from '@lg/contracts';
import { formatMoney, miniappMessages as t } from '@lg/i18n';
import {
  ActionSheet,
  EmptyState,
  InlineButton,
  ListItem,
  MoneyText,
  SearchField,
  Section,
  Segmented,
  type SheetAction,
  StatusChip,
} from '@lg/ui-tg';
import { Phone } from 'lucide-react';
import { useState } from 'react';
import type { DebtorFilter } from '../../data/staff-debtors.js';

const c = t.debtors;

const overdueText = (d: DebtorItem) =>
  d.overdueDays > 0 ? c.overdue.replace('{n}', String(d.overdueDays)) : c.notDue;

function DebtorRow({ d, onOpen }: { d: DebtorItem; onOpen: () => void }) {
  return (
    <ListItem
      title={d.name}
      subtitle={`${d.group} · ${overdueText(d)}`}
      after={
        <span className="flex flex-col items-end gap-1">
          <MoneyText amount={-BigInt(d.debt)} />
          {d.critical && <StatusChip tone="danger">{c.critical}</StatusChip>}
          {d.archived && <StatusChip tone="muted">{c.archived}</StatusChip>}
          {d.remindedToday && <StatusChip tone="muted">{c.reminded}</StatusChip>}
        </span>
      }
      chevron
      onClick={onOpen}
    />
  );
}

/** Qo'ng'iroq — havola (`tel:`), shuning uchun ActionSheet tugmasi emas. */
function SheetInfo({ d }: { d: DebtorItem }) {
  return (
    <div className="flex flex-col">
      <p className="px-4 py-3 text-center text-text">
        {overdueText(d)} · {formatMoney(BigInt(d.debt))}
      </p>
      {!d.canRemind && <p className="px-4 pb-3 text-center text-sm text-warning">{c.noTelegram}</p>}
      {d.guardian && (
        <a
          href={`tel:${d.guardian.phone}`}
          className="flex min-h-12 items-center justify-center gap-2 border-t border-border text-base text-link"
        >
          <Phone className="size-5" aria-hidden />
          {c.call}: {d.guardian.name}
        </a>
      )}
    </div>
  );
}

export interface DebtorsViewProps {
  items: readonly DebtorItem[];
  total: bigint;
  filter: DebtorFilter;
  canPay: boolean;
  onFilter: (f: DebtorFilter) => void;
  onCard: (d: DebtorItem) => void;
  onPay: (d: DebtorItem) => void;
  onRemind: (d: DebtorItem) => void;
  /** Yana bor bo'lsa. */
  onMore?: () => void;
}

/** MS-08 Qarzdorlar (T-132): filtr, qo'ng'iroq, eslatma, to'lov. */
export function DebtorsView(p: DebtorsViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = p.items.find((d) => d.id === openId);
  const close = () => setOpenId(null);
  const act = (label: string, run: (d: DebtorItem) => void): SheetAction => ({
    label,
    onSelect: () => {
      close();
      if (open) run(open);
    },
  });
  const actions = [
    ...(p.canPay ? [act(c.pay, p.onPay)] : []),
    ...(open?.canRemind && !open.remindedToday ? [act(c.remind, p.onRemind)] : []),
    act(c.card, p.onCard),
  ];
  return (
    <main className="flex flex-col gap-3 p-2 pt-3 pb-6">
      <h1 className="px-2 text-2xl font-bold text-text">{c.title}</h1>
      <Segmented<DebtorBucket>
        label={c.bucketLabel}
        value={p.filter.bucket}
        options={DEBTOR_BUCKETS.map((b) => ({ value: b, label: c.buckets[b] }))}
        onChange={(bucket) => p.onFilter({ ...p.filter, bucket })}
      />
      <SearchField
        value={p.filter.search}
        placeholder={c.search}
        clearLabel={c.clear}
        onChange={(search) => p.onFilter({ ...p.filter, search })}
      />
      {p.items.length === 0 ? (
        <EmptyState title={c.empty} hint={c.emptyHint} />
      ) : (
        <>
          <p className="flex justify-between px-4 text-text-muted">
            <span>{c.total}</span>
            <MoneyText amount={-p.total} className="font-semibold" />
          </p>
          <Section>
            {p.items.map((d) => (
              <DebtorRow key={d.id} d={d} onOpen={() => setOpenId(d.id)} />
            ))}
          </Section>
          {p.onMore && <InlineButton onClick={p.onMore}>{c.more}</InlineButton>}
        </>
      )}
      <ActionSheet
        open={open !== undefined}
        title={open?.name}
        actions={actions}
        cancelLabel={c.cancel}
        onClose={close}
      >
        {open && <SheetInfo d={open} />}
      </ActionSheet>
    </main>
  );
}
