import type { PaymentMethod } from '@lg/contracts';
import { ErrorNotice, OkNotice } from './notice.js';
import { miniappMessages as t } from '@lg/i18n';
import { errorText } from '@lg/ui-core';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useReceiptPdf } from '../data/guardian.js';
import { QueryView } from '../data/query-view.js';
import { useCreatePayment, usePayPreview } from '../data/staff-pay.js';
import { useStudentCard, useStudentSearch } from '../data/staff.js';
import { PayDoneView, PayView } from '../screens/staff/pay.js';
import { SearchView } from '../screens/staff/search.js';

function PayForm({ id, student }: { id: string; student: { name: string; code: string } }) {
  const navigate = useNavigate();
  const [key] = useState(() => crypto.randomUUID());
  const [amount, setAmount] = useState<bigint | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const preview = usePayPreview(id, amount);
  const create = useCreatePayment(key);
  const pdf = useReceiptPdf();
  const receipt = create.data?.receiptNumber;
  if (receipt)
    return (
      <>
        <ErrorNotice error={pdf.error} />
        <OkNotice text={pdf.isSuccess ? t.receiptSent : null} />
        <PayDoneView
          receipt={receipt}
          onReceipt={() => pdf.mutate(receipt)}
          onFinish={() => void navigate({ to: '/staff/student/$id', params: { id } })}
        />
      </>
    );
  return (
    <>
      {create.isError && (
        <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
          {errorText(create.error)}
        </p>
      )}
      <PayView
        student={student}
        preview={preview.data ?? null}
        amount={amount}
        method={method}
        saving={create.isPending}
        onAmount={setAmount}
        onMethod={setMethod}
        onSave={() => amount && create.mutate({ studentId: id, amount: amount.toString(), method })}
      />
    </>
  );
}

/** MS-07 To'lov kiritish (T-131): o'quvchi kartochkasidan yoki qidiruvdan. */
export function StaffPayPage() {
  const { id } = useParams({ from: '/staff/student/$id/pay' });
  const card = useStudentCard(id);
  return (
    <QueryView query={card}>
      {(d) => <PayForm id={id} student={{ name: d.hit.name, code: d.hit.code }} />}
    </QueryView>
  );
}

/** Koʻproq → «Toʻlov kiritish»: avval o'quvchini topish. */
export function StaffPaySearchPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const query = useStudentSearch(q);
  return (
    <SearchView
      title={t.staffPay.searchTitle}
      query={q}
      results={query.data ?? []}
      onQuery={setQ}
      onOpen={(s) => void navigate({ to: '/staff/student/$id/pay', params: { id: s.id } })}
    />
  );
}
