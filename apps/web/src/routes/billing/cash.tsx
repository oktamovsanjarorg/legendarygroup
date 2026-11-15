import type { CashDay as CashDayDto } from '@lg/contracts';
import { ErrorState, ForbiddenState, LoadingState } from '@lg/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorText, errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { todayYmd } from '../../lib/today.js';
import { type CashDay, CashView } from '../../screens/f2/cash.js';

export const toCashDay = (d: CashDayDto): CashDay => ({
  date: d.date,
  expected: BigInt(d.expectedCash),
  payments: d.payments.map((p) => ({
    time: new Date(p.paidAt),
    student: p.student,
    amount: BigInt(p.amount),
    receipt: p.receiptNumber ?? p.id,
  })),
  closed: d.closed ? { at: new Date(d.closed.at), by: d.closed.by ?? '—' } : undefined,
});

function CashScreen({ date }: { date: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['billing', 'cash', date],
    queryFn: () => api.request<CashDayDto>(`/billing/cash/day?date=${date}`),
  });
  const [counted, setCounted] = useState<bigint | null>(null);
  const [note, setNote] = useState('');
  const close = useMutation({
    mutationFn: (body: { date: string; countedCash: string; note?: string }) =>
      api.request('/billing/cash/close', { method: 'POST', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['billing', 'cash'] }),
  });
  if (q.isPending) return <LoadingState rows={4} />;
  if (q.isError) return <ErrorState {...errorView(q.error, () => void q.refetch())} />;
  const day = toCashDay(q.data);
  // Farq — ko'rsatish uchun bigint ayirma; rasmiy farqni server saqlaydi (closeCash).
  const diff = counted === null ? null : counted - day.expected;
  return (
    <>
      {close.isError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {errorText(close.error)}
        </p>
      )}
      <CashView
        day={day}
        counted={counted}
        diff={diff}
        note={note}
        onCounted={setCounted}
        onNote={setNote}
        onClose={() =>
          counted !== null &&
          close.mutate({
            date,
            countedCash: counted.toString(),
            ...(note.trim() ? { note: note.trim() } : {}),
          })
        }
      />
    </>
  );
}

/** W-16 Kassa (T-209, FR-PAY-10): `cash.close`. */
export function CashPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('cash.close'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <CashScreen date={todayYmd()} />;
}
