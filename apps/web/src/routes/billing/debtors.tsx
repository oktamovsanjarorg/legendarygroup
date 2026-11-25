import type { DebtorBucket, DebtorItem, DebtorListResponse } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { ForbiddenState } from '@lg/ui-web';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorText, errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { type Bucket, type DebtorRow, DebtorsView } from '../../screens/f2/debtors.js';
import { download } from './download.js';

export const toDebtorRow = (d: DebtorItem): DebtorRow => ({
  id: d.id,
  name: d.archived ? `${d.name} · ${t.common.archived}` : d.name,
  group: d.group,
  debt: BigInt(d.debt),
  overdueDays: d.overdueDays,
  lastPayment: d.lastPayment ? new Date(d.lastPayment) : undefined,
  reminders: d.reminders,
  critical: d.critical,
});

const useDebtors = (bucket: DebtorBucket) =>
  useInfiniteQuery({
    queryKey: ['billing', 'debtors', bucket],
    initialPageParam: '',
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ bucket });
      if (pageParam) q.set('cursor', pageParam);
      return api.request<DebtorListResponse>(`/billing/debtors?${q.toString()}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

function useRemind() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.request(`/billing/debtors/${id}/remind`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['billing', 'debtors'] }),
  });
}

function DebtorsScreen() {
  const navigate = useNavigate();
  const [bucket, setBucket] = useState<Bucket>('all');
  const list = useDebtors(bucket);
  const remind = useRemind();
  const pages = list.data?.pages ?? [];
  return (
    <>
      {remind.isError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {errorText(remind.error)}
        </p>
      )}
      <DebtorsView
        rows={pages.flatMap((p) => p.items).map(toDebtorRow)}
        bucket={bucket}
        total={BigInt(pages[0]?.totalDebt ?? '0')}
        onBucket={setBucket}
        onOpen={(r) => void navigate({ to: '/students/$id', params: { id: r.id } })}
        onExport={() => void download(`/billing/debtors/export?bucket=${bucket}`, 'qarzdorlar.csv')}
        onRemind={(r) => remind.mutate(r.id)}
        remindingId={remind.isPending ? remind.variables : undefined}
        loading={list.isPending}
        error={list.isError ? errorView(list.error, () => void list.refetch()) : undefined}
        onLoadMore={list.hasNextPage ? () => void list.fetchNextPage() : undefined}
        loadingMore={list.isFetchingNextPage}
      />
    </>
  );
}

/**
 * W-15 Qarzdorlar (T-208, FR-PAY-7, BR-21/22): `billing.view` ota-onada ham bor (o'z farzandi
 * cheklari) — markaz bo'yicha ro'yxat faqat xodimga (`payment.review`); API ham scope bilan.
 */
export function DebtorsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('billing.view') || !permissions.has('payment.review'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <DebtorsScreen />;
}
