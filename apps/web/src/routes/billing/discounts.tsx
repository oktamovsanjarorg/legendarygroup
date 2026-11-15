import type { DiscountListItem, DiscountListResponse } from '@lg/contracts';
import { ErrorState, ForbiddenState, LoadingState } from '@lg/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { type DiscountRow, DiscountsView } from '../../screens/f2/discounts.js';
import { DiscountDrawer } from './discount-drawer.js';

export const toDiscountRow = (d: DiscountListItem): DiscountRow => ({
  id: d.enrollmentId,
  student: `${d.student} · ${d.group}`,
  kind: 'percent',
  value: `${d.percent}%`,
  reason: d.reason ?? '—',
  by: d.by ?? '—',
  status: 'active',
});

function DiscountsScreen({ unlimited }: { unlimited: boolean }) {
  const q = useQuery({
    queryKey: ['billing', 'discounts'],
    queryFn: () => api.request<DiscountListResponse>('/billing/discounts'),
  });
  const [granting, setGranting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  if (q.isPending) return <LoadingState rows={4} />;
  if (q.isError) return <ErrorState {...errorView(q.error, () => void q.refetch())} />;
  return (
    <>
      {notice && (
        <p role="status" className="mb-4 rounded-md bg-success-bg p-3 text-sm text-success">
          {notice}
        </p>
      )}
      <DiscountsView
        rows={q.data.items.map(toDiscountRow)}
        adminLimit={q.data.adminLimitPercent}
        onGrant={() => setGranting(true)}
      />
      {granting && (
        <DiscountDrawer
          limit={q.data.adminLimitPercent}
          unlimited={unlimited}
          onClose={() => setGranting(false)}
          onDone={(m) => {
            setGranting(false);
            setNotice(m);
          }}
        />
      )}
    </>
  );
}

/** W-18 Chegirmalar (T-203, BR-18): `discount.grant`; Director — limitsiz. */
export function DiscountsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('discount.grant'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <DiscountsScreen unlimited={permissions.has('approval.decide')} />;
}
