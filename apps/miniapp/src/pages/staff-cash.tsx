import { miniappMessages as t } from '@lg/i18n';
import { useHaptic } from '@lg/ui-tg';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import { type CashForm, useCashDay, useCashHistory, useCloseCash } from '../data/staff-cash.js';
import { CashView } from '../screens/staff/cash.js';
import { ErrorNotice, OkNotice } from './notice.js';

const EMPTY: CashForm = { counted: null, note: '' };

/** MS-16 Kassa (T-140, FR-PAY-10). */
export function StaffCashPage() {
  const today = useClock().today();
  const haptic = useHaptic();
  const [date, setDate] = useState(today);
  const [form, setForm] = useState(EMPTY);
  const day = useCashDay(date);
  const history = useCashHistory();
  const close = useCloseCash();
  const openDate = (d: string) => {
    close.reset();
    setForm(EMPTY);
    setDate(d);
  };
  return (
    <>
      <ErrorNotice error={close.error ?? history.error} />
      <OkNotice text={close.isSuccess ? t.cash.done : null} />
      <QueryView query={day}>
        {(d) => (
          <CashView
            day={d}
            today={today}
            form={form}
            saving={close.isPending || day.isPlaceholderData}
            history={history.data ?? []}
            onDate={openDate}
            onForm={setForm}
            onClose={() =>
              form.counted !== null &&
              close.mutate(
                {
                  date: d.date,
                  countedCash: form.counted.toString(),
                  note: form.note.trim() || undefined,
                },
                { onSuccess: () => haptic.success(), onError: () => haptic.error() },
              )
            }
            onMore={history.hasNextPage ? () => void history.fetchNextPage() : undefined}
          />
        )}
      </QueryView>
    </>
  );
}
