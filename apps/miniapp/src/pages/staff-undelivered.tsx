import { miniappMessages as t } from '@lg/i18n';
import { useState } from 'react';
import { QueryView } from '../data/query-view.js';
import {
  type UndeliveredFilter,
  useRetryMessages,
  useUndelivered,
} from '../data/staff-undelivered.js';
import { UndeliveredView } from '../screens/staff/undelivered.js';
import { ErrorNotice, OkNotice } from './notice.js';

/** MS-26 Yetib bormagan xabarlar (T-155). */
export function StaffUndeliveredPage() {
  const [filter, setFilter] = useState<UndeliveredFilter>('all');
  const query = useUndelivered(filter);
  const retry = useRetryMessages();
  return (
    <QueryView query={query}>
      {(items) => (
        <>
          <ErrorNotice error={retry.error} />
          <OkNotice text={retry.isSuccess ? t.undelivered.queued : null} />
          <UndeliveredView
            items={items}
            filter={filter}
            busy={retry.isPending}
            onFilter={setFilter}
            onRetry={(ids) => retry.mutate(ids)}
          />
        </>
      )}
    </QueryView>
  );
}
