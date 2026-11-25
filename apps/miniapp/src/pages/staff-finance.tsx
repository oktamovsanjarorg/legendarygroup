import type { ExpenseItem } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { useHaptic } from '@lg/ui-tg';
import { useNavigate, useParams, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import {
  emptyExpense,
  expenseForm,
  expenseRequest,
  shiftPeriod,
  useDeleteExpense,
  useExpense,
  useExpenses,
  usePnl,
  useSaveExpense,
} from '../data/staff-finance.js';
import { ExpenseView } from '../screens/staff/expense.js';
import { FinanceView } from '../screens/staff/finance.js';
import { useOpenFile } from '../data/open-file.js';
import { useMe } from '../session/session.js';
import { ErrorNotice } from './notice.js';
import { useFilePicker } from './use-file-picker.js';

/** MS-27 Moliya (T-143, T-156): `finance.view`; xarajatlar ro'yxati — `expense.manage`. */
export function StaffFinancePage() {
  const navigate = useNavigate();
  const canExpense = useMe().permissions.includes('expense.manage');
  const current = useClock().today().slice(0, 7);
  const [period, setPeriod] = useState(current);
  const pnl = usePnl(period);
  const expenses = useExpenses(period, canExpense);
  return (
    <>
      <ErrorNotice error={expenses.error} />
      <QueryView query={pnl}>
        {(d) => (
          <FinanceView
            pnl={d}
            period={period}
            current={current}
            expenses={canExpense ? (expenses.data ?? []) : null}
            onPeriod={(step) => setPeriod(shiftPeriod(period, step))}
            onAdd={() => void navigate({ to: '/staff/expenses/new' })}
            onExpense={(e) => void navigate({ to: '/staff/expenses/$id', params: { id: e.id } })}
            onMore={expenses.hasNextPage ? () => void expenses.fetchNextPage() : undefined}
          />
        )}
      </QueryView>
    </>
  );
}

/** Saqlangach — kelgan ekranga (Ko'proq yoki Moliya). */
function useDone() {
  const haptic = useHaptic();
  const router = useRouter();
  const navigate = useNavigate();
  return {
    onSuccess: () => {
      haptic.success();
      if (router.history.canGoBack()) router.history.back();
      else void navigate({ to: '/staff/more' });
    },
    onError: () => haptic.error(),
  };
}

/** MS-18 Yangi xarajat (T-142). */
export function StaffExpenseNewPage() {
  const today = useClock().today();
  const [form, setForm] = useState(() => emptyExpense(today));
  const save = useSaveExpense();
  const file = useFilePicker('expense_receipt');
  const done = useDone();
  return (
    <>
      <ErrorNotice error={save.error} />
      {file.input}
      <ExpenseView
        title={t.fin.addTitle}
        today={today}
        form={form}
        saving={save.isPending}
        file={file.state}
        onPickFile={file.open}
        onForm={setForm}
        onSave={() => {
          const body = expenseRequest(form, file.fileId);
          if (body) save.mutate(body, done);
        }}
      />
    </>
  );
}

function ExpenseEdit({ item }: { item: ExpenseItem }) {
  const { fileId } = item;
  const today = useClock().today();
  const [form, setForm] = useState(() => expenseForm(item));
  const save = useSaveExpense(item.id);
  const file = useFilePicker('expense_receipt');
  const openFile = useOpenFile();
  const del = useDeleteExpense(item.id);
  const done = useDone();
  return (
    <>
      <ErrorNotice error={save.error ?? del.error ?? openFile.error} />
      {file.input}
      <ExpenseView
        title={t.fin.editTitle}
        today={today}
        form={form}
        saving={save.isPending || del.isPending}
        file={file.state}
        onPickFile={file.open}
        onForm={setForm}
        onSave={() => {
          const body = expenseRequest(form, file.fileId);
          if (body) save.mutate(body, done);
        }}
        onOpenFile={fileId ? () => openFile.mutate(fileId) : undefined}
        onDelete={() => del.mutate(undefined, done)}
      />
    </>
  );
}

export function StaffExpensePage() {
  const { id } = useParams({ from: '/staff/expenses/$id' });
  const query = useExpense(id);
  return <QueryView query={query}>{(e) => <ExpenseEdit key={e.id} item={e} />}</QueryView>;
}
