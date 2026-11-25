import type { UndeliveredNotificationItem } from '@lg/contracts';
import { formatDateTime, miniappMessages as t } from '@lg/i18n';
import { ActionSheet, EmptyState, ListItem, Section, Segmented, useMainButton } from '@lg/ui-tg';
import { useState } from 'react';
import {
  retryable,
  type UndeliveredFilter,
  undeliveredReason,
} from '../../data/staff-undelivered.js';
import { Screen } from './form-kit.js';
import { CallLink } from './kit.js';

const c = t.undelivered;

export interface UndeliveredViewProps {
  items: readonly UndeliveredNotificationItem[];
  filter: UndeliveredFilter;
  busy: boolean;
  onFilter: (f: UndeliveredFilter) => void;
  onRetry: (ids: readonly string[]) => void;
}

function MessageSheet({
  item: open,
  onClose,
  onRetry,
}: {
  item: UndeliveredNotificationItem | undefined;
  onClose: () => void;
  onRetry: (ids: readonly string[]) => void;
}) {
  return (
    <ActionSheet
      open={open !== undefined}
      title={open?.userName}
      cancelLabel={t.staffKit.cancel}
      onClose={onClose}
      actions={
        open?.retryable
          ? [
              {
                label: c.retry,
                onSelect: () => {
                  onClose();
                  onRetry([open.id]);
                },
              },
            ]
          : []
      }
    >
      {open && (
        <div className="flex flex-col gap-2 px-4 pb-2">
          <p className="whitespace-pre-wrap break-words text-sm text-text-muted">{open.body}</p>
          {open.phone && <CallLink phone={open.phone} />}
        </div>
      )}
    </ActionSheet>
  );
}

/** MS-26 Yetib bormagan xabarlar (T-155): sabab, qo'ng'iroq, qayta yuborish. */
export function UndeliveredView(p: UndeliveredViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = p.items.find((x) => x.id === openId);
  const again = retryable(p.items).map((x) => x.id);
  useMainButton({
    text: c.retryAll.replace('{n}', String(again.length)),
    visible: again.length > 0,
    loading: p.busy,
    onClick: () => p.onRetry(again),
  });
  return (
    <Screen title={c.title} subtitle={c.hint}>
      <Segmented<UndeliveredFilter>
        label={c.filterLabel}
        value={p.filter}
        options={(['all', 'blocked', 'failed'] as const).map((value) => ({
          value,
          label: c.filters[value],
        }))}
        onChange={p.onFilter}
      />
      {p.items.length === 0 ? (
        <EmptyState title={c.empty} hint={c.emptyHint} />
      ) : (
        <Section>
          {p.items.map((x) => (
            <ListItem
              key={x.id}
              title={x.userName}
              subtitle={`${c.types[x.type]} · ${undeliveredReason(x)} · ${formatDateTime(new Date(x.createdAt))}`}
              chevron
              onClick={() => setOpenId(x.id)}
            />
          ))}
        </Section>
      )}
      <MessageSheet item={open} onClose={() => setOpenId(null)} onRetry={p.onRetry} />
    </Screen>
  );
}
