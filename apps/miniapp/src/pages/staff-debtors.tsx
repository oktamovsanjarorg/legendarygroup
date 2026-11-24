import { miniappMessages as t } from '@lg/i18n';
import { errorText } from '@lg/ui-core';
import { useHaptic } from '@lg/ui-tg';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { QueryView } from '../data/query-view.js';
import { type DebtorFilter, useDebtors, useRemindDebtor } from '../data/staff-debtors.js';
import { DebtorsView } from '../screens/staff/debtors.js';
import { useMe } from '../session/session.js';

/** MS-08 Qarzdorlar (T-132, FR-PAY-7): xodim ro'yxati; ruxsat — server (403 → «Ruxsat yo'q»). */
export function StaffDebtorsPage() {
  const me = useMe();
  const navigate = useNavigate();
  const haptic = useHaptic();
  const [filter, setFilter] = useState<DebtorFilter>({ bucket: 'all', search: '' });
  const query = useDebtors(filter);
  const remind = useRemindDebtor();
  return (
    <>
      {remind.isError && (
        <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
          {errorText(remind.error)}
        </p>
      )}
      {remind.isSuccess && (
        <p role="status" className="mx-4 mt-3 rounded-xl bg-success-bg p-3 text-sm text-success">
          {t.debtors.remindSent.replace('{name}', remind.variables.name)}
        </p>
      )}
      <QueryView query={query}>
        {(d) => (
          <DebtorsView
            items={d.items}
            total={d.total}
            filter={filter}
            canPay={me.permissions.includes('payment.create')}
            onFilter={setFilter}
            onCard={(s) => void navigate({ to: '/staff/student/$id', params: { id: s.id } })}
            onPay={(s) => void navigate({ to: '/staff/student/$id/pay', params: { id: s.id } })}
            onRemind={(s) =>
              remind.mutate(s, {
                onSuccess: () => haptic.success(),
                onError: () => haptic.error(),
              })
            }
            onMore={query.hasNextPage ? () => void query.fetchNextPage() : undefined}
          />
        )}
      </QueryView>
    </>
  );
}
