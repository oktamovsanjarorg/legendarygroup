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
import { MOCK_EXPENSES_MONTH_DELTA, MOCK_EXPENSES_TOTAL } from './mock-finance.js';
import type { ExpenseCategory, ExpenseItem, ExpenseMethod } from './types.js';

interface Props {
  expenses: readonly ExpenseItem[];
  total?: bigint;
  onAddExpense?: (item: {
    category: ExpenseCategory;
    description: string;
    amount: bigint;
    method: ExpenseMethod;
    date: string;
  }) => void;
}

const CATEGORIES: readonly ExpenseCategory[] = [
  'rent',
  'utilities',
  'marketing',
  'salary',
  'supplies',
  'equipment',
  'other',
];
const isCategory = (v: string): v is ExpenseCategory =>
  (CATEGORIES as readonly string[]).includes(v);

const METHODS: readonly ExpenseMethod[] = ['cash', 'bank', 'card'];
const isMethod = (v: string): v is ExpenseMethod => (METHODS as readonly string[]).includes(v);

const compareBigint = (a: bigint, b: bigint): number => (a < b ? -1 : a > b ? 1 : 0);

const CATEGORY_TONES: Record<ExpenseCategory, 'info' | 'warning' | 'muted' | 'success'> = {
  rent: 'warning',
  utilities: 'info',
  marketing: 'success',
  salary: 'info',
  supplies: 'muted',
  equipment: 'muted',
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
    accessorKey: 'method',
    header: t.expenses.cols.method,
    cell: ({ row }) => t.expenses.methods[row.original.method],
  },
  {
    id: 'receipt',
    header: t.expenses.cols.receipt,
    cell: ({ row }) =>
      row.original.receiptUrl ? (
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

const CAT_OPTIONS = Object.entries(t.expenses.categories).map(([val, label]) => ({
  value: val,
  label,
}));

const METHOD_OPTIONS = Object.entries(t.expenses.methods).map(([val, label]) => ({
  value: val,
  label,
}));

function ExpenseFormFields({
  category,
  desc,
  amount,
  method,
  date,
  onCategoryChange,
  onDescChange,
  onAmountChange,
  onMethodChange,
  onDateChange,
}: {
  category: ExpenseCategory;
  desc: string;
  amount: bigint | null;
  method: ExpenseMethod;
  date: string;
  onCategoryChange: (c: ExpenseCategory) => void;
  onDescChange: (d: string) => void;
  onAmountChange: (a: bigint | null) => void;
  onMethodChange: (m: ExpenseMethod) => void;
  onDateChange: (d: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <SelectField
        label={t.expenses.form.categoryLabel}
        options={CAT_OPTIONS}
        value={category}
        onChange={(e) => {
          if (isCategory(e.target.value)) onCategoryChange(e.target.value);
        }}
      />
      <MoneyField label={t.expenses.form.amountLabel} value={amount} onChange={onAmountChange} />
      <Field
        label={t.expenses.form.dateLabel}
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
      />
      <Field
        label={t.expenses.form.descLabel}
        value={desc}
        onChange={(e) => onDescChange(e.target.value)}
      />
      <SelectField
        label={t.expenses.form.methodLabel}
        options={METHOD_OPTIONS}
        value={method}
        onChange={(e) => {
          if (isMethod(e.target.value)) onMethodChange(e.target.value);
        }}
      />
    </div>
  );
}

function ExpenseFormDrawer({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd?: (item: {
    category: ExpenseCategory;
    description: string;
    amount: bigint;
    method: ExpenseMethod;
    date: string;
  }) => void;
}) {
  const [category, setCategory] = useState<ExpenseCategory>('rent');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [method, setMethod] = useState<ExpenseMethod>('bank');
  const [date, setDate] = useState('2026-11-12');

  const handleSave = () => {
    if (!amount || amount <= 0n) return;
    onAdd?.({ category, description: desc, amount, method, date });
    onClose();
  };

  return (
    <Drawer
      open={open}
      title={t.expenses.form.title}
      closeLabel={t.common.cancel}
      onClose={onClose}
    >
      <ExpenseFormFields
        category={category}
        desc={desc}
        amount={amount}
        method={method}
        date={date}
        onCategoryChange={setCategory}
        onDescChange={setDesc}
        onAmountChange={setAmount}
        onMethodChange={setMethod}
        onDateChange={setDate}
      />
      <div className="mt-4">
        <Button onClick={handleSave}>
          <Plus className="size-4" aria-hidden />
          {t.expenses.form.submit}
        </Button>
      </div>
    </Drawer>
  );
}

/** W-23 Xarajatlar (FR-FIN-1). */
export function ExpensesView({ expenses, total = MOCK_EXPENSES_TOTAL, onAddExpense }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <PageHeader
        title={t.expenses.title}
        description={t.expenses.subtitle}
        actions={
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t.expenses.new}
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <KpiCard
          label={t.expenses.kpi.thisMonth}
          value={formatMoney(total)}
          delta={{ text: '+4%', up: true, good: false }}
        />
        <KpiCard label={t.expenses.kpi.topCategory} value={t.expenses.categories.rent} />
        <KpiCard
          label={t.expenses.kpi.compareMonth}
          value={`+${formatMoney(MOCK_EXPENSES_MONTH_DELTA)}`}
          delta={{ text: t.expenses.kpi.withinPlan, up: false, good: true }}
        />
      </div>

      <DataTable
        data={expenses}
        columns={columns}
        getRowId={(r) => r.id}
        numeric={['amount']}
        empty={{ title: t.expenses.empty }}
      />

      <ExpenseFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAdd={onAddExpense}
      />
    </>
  );
}
