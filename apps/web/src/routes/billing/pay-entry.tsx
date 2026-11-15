import type { PaymentMethod, PaymentPreview, StudentListRow } from '@lg/contracts';
import { formatPeriod } from '@lg/i18n';
import { ForbiddenState } from '@lg/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { type KeyboardEvent, useState } from 'react';
import { errorText } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { useDebounced } from '../../lib/use-debounced.js';
import {
  type AllocationPreview,
  type PayEntryState,
  type PayMethod,
  type PayStudent,
  PayEntryView,
} from '../../screens/f2/pay-entry.js';
import {
  openReceiptPdf,
  useCreatePayment,
  usePaymentPreview,
  usePayStudentSearch,
} from './use-pay-entry.js';

/** Ekran usuli → API usuli (03 §2: cash/card/bank/other). */
export const API_METHOD: Record<PayMethod, PaymentMethod> = {
  cash: 'cash',
  card_terminal: 'card',
  transfer: 'bank',
  other: 'other',
};

export const toPayStudent = (s: StudentListRow): PayStudent => ({
  id: s.id,
  name: s.fullName,
  code: `LG-${s.code}`,
  group: s.groups.map((g) => g.name).join(', '),
  debt: 0n,
});

export const toAllocation = (p: PaymentPreview): AllocationPreview => ({
  parts: p.parts.map((x) => ({
    month: formatPeriod(x.period),
    amount: BigInt(x.amount),
    closes: x.closes,
  })),
  advance: BigInt(p.advance),
});

const newKey = () => crypto.randomUUID();

interface ListNav {
  results: readonly PayStudent[];
  hi: number;
  setHi: (i: number) => void;
  pick: (s: PayStudent) => void;
}

/** Qidiruv natijalarida ↑↓ va Enter (sichqonchasiz kiritish, FR-PAY-2). */
function listKeys(e: KeyboardEvent, { results, hi, setHi, pick }: ListNav) {
  if (results.length === 0) return;
  if (e.key === 'ArrowDown') setHi(Math.min(hi + 1, results.length - 1));
  else if (e.key === 'ArrowUp') setHi(Math.max(hi - 1, 0));
  else if (e.key === 'Enter' && results[hi]) pick(results[hi]);
  else return;
  e.preventDefault();
}

type CreateState = ReturnType<typeof useCreatePayment>;

/** Ekran holati: tanlangan o'quvchi qarzi va taqsimot — server preview'idan. */
function viewState(
  base: Omit<PayEntryState, 'preview' | 'saving' | 'savedReceipt' | 'error'>,
  p: PaymentPreview | undefined,
  create: CreateState,
): PayEntryState {
  const st = base.student;
  return {
    ...base,
    results: st ? [] : base.results,
    student: st && p ? { ...st, debt: BigInt(p.debt) } : st,
    preview: base.amount && p ? toAllocation(p) : null,
    saving: create.isPending,
    savedReceipt: create.data?.receiptNumber ?? undefined,
    error: create.isError ? errorText(create.error) : undefined,
  };
}

function usePayEntry() {
  const [query, setQuery] = useState('');
  const [hi, setHi] = useState(0);
  const [student, setStudent] = useState<PayStudent | null>(null);
  const [amount, setAmount] = useState<bigint | null>(null);
  const [method, setMethod] = useState<PayMethod>('cash');
  const [key, setKey] = useState(newKey);
  const q = useDebounced(query.trim());
  const search = usePayStudentSearch(student ? '' : q);
  const preview = usePaymentPreview(student?.id ?? null, amount);
  const create = useCreatePayment();
  const results = (search.data?.items ?? []).slice(0, 8).map(toPayStudent);
  const s = viewState(
    { query, results, highlighted: hi, student, amount, method },
    preview.data,
    create,
  );
  const reset = () => {
    setQuery('');
    setStudent(null);
    setAmount(null);
    setMethod('cash');
    setKey(newKey());
    create.reset();
  };
  const pick = (st: PayStudent) => {
    setStudent(st);
    setHi(0);
  };
  const submit = () => {
    if (!student || amount === null || amount <= 0n) return;
    create.mutate({
      key,
      body: { studentId: student.id, amount: amount.toString(), method: API_METHOD[method] },
    });
  };
  const onQuery = (v: string) => {
    setStudent(null);
    setQuery(v);
    setHi(0);
  };
  return { s, results, hi, setHi, pick, submit, reset, onQuery, setAmount, setMethod };
}

function PayEntryScreen() {
  const e = usePayEntry();
  const receipt = e.s.savedReceipt;
  return (
    <div
      onKeyDownCapture={(ev) =>
        !e.s.student &&
        listKeys(ev, { results: e.s.results, hi: e.hi, setHi: e.setHi, pick: e.pick })
      }
    >
      <PayEntryView
        s={e.s}
        onQuery={e.onQuery}
        onPick={e.pick}
        onAmount={e.setAmount}
        onMethod={e.setMethod}
        onSubmit={e.submit}
        onNext={e.reset}
        onPrint={receipt ? () => void openReceiptPdf(receipt) : undefined}
      />
    </div>
  );
}

/** W-13 To'lov kiritish (T-204, FR-PAY-2, BR-11/12): `payment.create`. */
export function PayEntryPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('payment.create'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <PayEntryScreen />;
}
