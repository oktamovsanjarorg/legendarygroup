import { EXPENSE_CATEGORIES } from '@lg/contracts';
import { formatDateShort, formatMoney, webMessages as t } from '@lg/i18n';
import {
  Badge,
  Button,
  type ColumnDef,
  DataTable,
  Drawer,
  Field,
  KpiCard,
  MoneyField,
  PageHeader,
  SelectField,
} from '@lg/ui-web';
import { FileText, Plus } from 'lucide-react';
import { useState } from 'react';
import type { ExpenseCategory, ExpenseItem } from './types.js';

export interface NewExpense {
  category: ExpenseCategory;
  note: string;
  amount: bigint;
  date: string;
  file: File | null;
}

/** KPI — server hisoblari (P&L); UI faqat ko'rsatadi. */
export interface ExpensesKpi {
  total: bigint;
  topCategory: ExpenseCategory | null;
  /** O'tgan oyga nisbatan farq (bigint ayirma, faqat ko'rinish). */
  delta: bigint | null;
}

interface Props {
  expenses: readonly ExpenseItem[];
  kpi: ExpensesKpi;
  /** Yo'q bo'lsa — "qo'shish" tugmasi ko'rinmaydi. */
  onAdd?: (item: NewExpense) => void;
  saving?: boolean;
  /** Saqlash xatosi (server matni). */
  error?: string;
  /** Saqlangach drawer yopilishi uchun — har muvaffaqiyatda o'zgaradi. */
  savedKey?: number;
  loading?: boolean;
  loadError?: { message: string; requestId?: string; onRetry: () => void };
}

const compareBigint = (a: bigint, b: bigint): number => (a < b ? -1 : a > b ? 1 : 0);
const isCategory = (v: string): v is ExpenseCategory =>
  (EXPENSE_CATEGORIES as readonly string[]).includes(v);

const CATEGORY_TONES: Record<ExpenseCategory, 'info' | 'warning' | 'muted' | 'success'> = {
  rent: 'warning',
  utilities: 'info',
  marketing: 'success',
  salary: 'info',
  supplies: 'muted',
  maintenance: 'muted',
  other: 'muted',
};

const columns: ColumnDef<ExpenseItem, unknown>[] = [
  {
    accessorKey: 'date',
    header: t.expenses.cols.date,
    cell: ({ row }) => formatDateShort(row.original.date),
  },
  {
    accessorKey: 'category',
    header: t.expenses.cols.category,
    cell: ({ row }) => (
      <Badge tone={CATEGORY_TONES[row.original.category]}>
        {t.expenses.categories[row.original.category]}
      </Badge>
    ),
  },
  {
    accessorKey: 'description',
    header: t.expenses.cols.description,
    cell: ({ row }) => <span className="font-medium text-text">{row.original.description}</span>,
  },
  {
    accessorKey: 'amount',
    header: t.expenses.cols.amount,
    sortingFn: (a, b) => compareBigint(a.original.amount, b.original.amount),
    cell: ({ row }) => (
      <span className="font-semibold text-text">{formatMoney(row.original.amount)}</span>
    ),
  },
  {
    id: 'receipt',
    header: t.expenses.cols.receipt,
    cell: ({ row }) =>
      row.original.hasReceipt ? (
        <span className="flex items-center gap-1 text-xs text-primary">
          <FileText className="size-3.5" aria-hidden />
          {t.expenses.cols.receipt}
        </span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  { accessorKey: 'author', header: t.expenses.cols.author },
];

const CAT_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: t.expenses.categories[c] }));

interface FormProps {
  today: string;
  onAdd: (item: NewExpense) => void;
  onClose: () => void;
  saving?: boolean;
  error?: string;
}

function ExpenseFormDrawer({ today, onAdd, onClose, saving, error }: FormProps) {
  const [category, setCategory] = useState<ExpenseCategory>('rent');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [date, setDate] = useState(today);
  const [file, setFile] = useState<File | null>(null);
  const [invalid, setInvalid] = useState(false);
  const save = () => {
    if (!amount || amount <= 0n) return setInvalid(true);
    setInvalid(false);
    onAdd({ category, note: note.trim(), amount, date, file });
  };
  return (
    <Drawer open title={t.expenses.form.title} closeLabel={t.common.cancel} onClose={onClose}>
      <div className="flex flex-col gap-4 text-sm">
        <SelectField
          label={t.expenses.form.categoryLabel}
          options={CAT_OPTIONS}
          value={category}
          onChange={(e) => isCategory(e.target.value) && setCategory(e.target.value)}
        />
        <MoneyField
          label={t.expenses.form.amountLabel}
          value={amount}
          onChange={setAmount}
          error={invalid ? t.expenses.form.amountRequired : undefined}
        />
        <Field
          label={t.expenses.form.dateLabel}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Field
          label={t.expenses.form.descLabel}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Field
          label={t.expenses.form.receiptLabel}
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <Button onClick={save} loading={saving}>
          <Plus className="size-4" aria-hidden />
          {t.expenses.form.submit}
        </Button>
      </div>
    </Drawer>
  );
}

function Kpis({ kpi }: { kpi: ExpensesKpi }) {
  const d = kpi.delta;
  return (
    <div className="mb-6 grid grid-cols-3 gap-4">
      <KpiCard label={t.expenses.kpi.thisMonth} value={formatMoney(kpi.total)} />
      <KpiCard
        label={t.expenses.kpi.topCategory}
        value={kpi.topCategory ? t.expenses.categories[kpi.topCategory] : '—'}
      />
      <KpiCard
        label={t.expenses.kpi.compareMonth}
        value={d === null ? '—' : `${d > 0n ? '+' : ''}${formatMoney(d)}`}
      />
    </div>
  );
}

/** W-23 Xarajatlar (FR-FIN-1): kategoriya, summa, sana, izoh, chek fayli. */
export function ExpensesView(p: Props & { today?: string }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(p.savedKey);
  if (p.savedKey !== seen) {
    setSeen(p.savedKey);
    setOpen(false);
  }
  return (
    <>
      <PageHeader
        title={t.expenses.title}
        description={t.expenses.subtitle}
        actions={
          p.onAdd && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" aria-hidden />
              {t.expenses.new}
            </Button>
          )
        }
      />
      <Kpis kpi={p.kpi} />
      <DataTable
        data={p.expenses}
        columns={columns}
        getRowId={(r) => r.id}
        numeric={['amount']}
        empty={{ title: t.expenses.empty }}
        loading={p.loading}
        error={p.loadError}
      />
      {open && p.onAdd && (
        <ExpenseFormDrawer
          today={p.today ?? ''}
          onAdd={p.onAdd}
          onClose={() => setOpen(false)}
          saving={p.saving}
          error={p.error}
        />
      )}
    </>
  );
}
