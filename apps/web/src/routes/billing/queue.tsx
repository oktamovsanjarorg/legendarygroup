import type { PaymentSubmission } from '@lg/contracts';
import { miniappMessages as m, webMessages as t } from '@lg/i18n';
import { Button, Drawer, ErrorState, ForbiddenState, LoadingState } from '@lg/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { errorText, errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { type WebQueueItem, WebQueueView } from '../../screens/f2/queue.js';
import { useDecideSubmission, usePendingSubmissions } from './use-queue.js';

const r = m.review;

export const toQueueItem = (s: PaymentSubmission): WebQueueItem => ({
  id: s.id,
  imageUrl: s.fileUrl ?? '',
  student: s.studentName ?? '—',
  group: s.groupName ?? '',
  guardian: s.guardianName ?? '',
  amount: BigInt(s.amountClaimed),
  sentAt: new Date(s.createdAt),
  comment: s.comment ?? undefined,
  overdue: s.overdue,
  duplicate: s.duplicateWarning ?? undefined,
});

function RejectDrawer({
  onReject,
  onClose,
  pending,
}: {
  onReject: (reason: string) => void;
  onClose: () => void;
  pending: boolean;
}) {
  const [reason, setReason] = useState('');
  const ok = reason.trim().length >= 3;
  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button
        variant="danger"
        disabled={!ok}
        loading={pending}
        onClick={() => onReject(reason.trim())}
      >
        {r.reject}
      </Button>
    </>
  );
  return (
    <Drawer
      open
      title={r.rejectTitle}
      closeLabel={t.common.close}
      onClose={onClose}
      footer={footer}
    >
      <div className="flex flex-col gap-2">
        {Object.values(r.reasons).map((text) => (
          <Button
            key={text}
            variant={reason === text ? 'primary' : 'secondary'}
            onClick={() => setReason(text)}
          >
            {text}
          </Button>
        ))}
        <label htmlFor="reject-reason" className="mt-2 text-sm font-medium text-text">
          {r.otherReason}
        </label>
        <textarea
          id="reject-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded-md border border-border bg-bg p-3 text-sm"
        />
      </div>
    </Drawer>
  );
}

/** Tanlangan chek (yo'q bo'lsa — eng eskisi) va unga tahrirlangan summa. */
function useSelection(items: readonly WebQueueItem[]) {
  const [picked, setPicked] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, bigint | null>>({});
  const cur = items.find((i) => i.id === picked) ?? items[0];
  const selected = cur?.id ?? null;
  const edited = selected !== null && selected in amounts;
  const amount = edited ? (amounts[selected] ?? null) : (cur?.amount ?? null);
  const setAmount = (v: bigint | null) => {
    if (selected) setAmounts((a) => ({ ...a, [selected]: v }));
  };
  return { selected, amount, setPicked, setAmount };
}

function QueueScreen() {
  const list = usePendingSubmissions();
  const items = (list.data ?? []).map(toQueueItem);
  const decide = useDecideSubmission();
  const { selected, amount, setPicked, setAmount } = useSelection(items);
  const [rejecting, setRejecting] = useState(false);
  if (list.isPending) return <LoadingState rows={4} />;
  if (list.isError) return <ErrorState {...errorView(list.error, () => void list.refetch())} />;
  const done = () => {
    setRejecting(false);
    setPicked(null);
  };
  return (
    <>
      {decide.isError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {errorText(decide.error)}
        </p>
      )}
      <WebQueueView
        items={items}
        selected={selected}
        amount={amount}
        onSelect={setPicked}
        onAmount={setAmount}
        onApprove={() =>
          selected &&
          amount !== null &&
          decide.mutate({ id: selected, kind: 'confirm', amount }, { onSuccess: done })
        }
        onReject={() => setRejecting(true)}
      />
      {rejecting && selected && (
        <RejectDrawer
          pending={decide.isPending}
          onClose={() => setRejecting(false)}
          onReject={(reason) =>
            decide.mutate({ id: selected, kind: 'reject', reason }, { onSuccess: done })
          }
        />
      )}
    </>
  );
}

/** W-14 Chek navbati (T-207, FR-PAY-4/5, BR-13): `payment.review`. */
export function QueuePage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('payment.review'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <QueueScreen />;
}
