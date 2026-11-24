import { miniappMessages as t } from '@lg/i18n';
import { errorText } from '@lg/ui-core';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useClock } from '../data/deps.js';
import { useChildPayments, useChildren } from '../data/guardian.js';
import {
  useMySubmission,
  useMyTickets,
  usePaymentCard,
  useSendAbsence,
  useSendTicket,
  useSubmitReceipt,
} from '../data/guardian-actions.js';
import { QueryView } from '../data/query-view.js';
import { useSelectedChild } from '../data/selected-child.js';
import { AbsenceView } from '../screens/guardian/absence.js';
import { PayView } from '../screens/guardian/pay.js';
import { SubmissionView } from '../screens/guardian/submission.js';
import { TicketsView } from '../screens/guardian/tickets.js';
import { useFilePicker } from './use-file-picker.js';
import { useMe } from '../session/session.js';

const Alert = ({ error }: { error: unknown }) => (
  <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
    {errorText(error)}
  </p>
);

/** MG-03 o'tkazma cheki (FR-PAY-3, T-206): karta → fayl (S3) → yuborish → holat. */
export function GuardianPayPage() {
  const navigate = useNavigate();
  const children = useChildren();
  const ids = children.data?.map((c) => c.id) ?? [];
  const [childId] = useSelectedChild(ids);
  const card = usePaymentCard();
  const payments = useChildPayments(childId);
  const submit = useSubmitReceipt();
  const picker = useFilePicker('payment_receipt');

  return (
    <QueryView query={card} empty={{ when: (c) => c === null, title: t.pay.card }}>
      {(c) =>
        c && (
          <>
            {submit.isError && <Alert error={submit.error} />}
            {picker.input}
            <PayView
              childTabs={(children.data ?? []).map((ch) => ({ id: ch.id, name: ch.fullName }))}
              initialChild={childId ?? ''}
              debt={payments.data?.debt ?? 0n}
              card={c}
              file={picker.state}
              sending={submit.isPending}
              onPickFile={picker.open}
              onSubmit={(form) =>
                picker.fileId &&
                submit.mutate(
                  { ...form, studentId: form.childId, fileId: picker.fileId },
                  {
                    onSuccess: (s) =>
                      void navigate({ to: '/submission/$id', params: { id: s.id } }),
                  },
                )
              }
            />
          </>
        )
      }
    </QueryView>
  );
}

export function GuardianSubmissionPage() {
  const { id } = useParams({ from: '/submission/$id' });
  const navigate = useNavigate();
  const query = useMySubmission(id);
  return (
    <QueryView query={query} empty={{ when: (d) => d === null, title: t.submission.title }}>
      {(d) =>
        d && (
          <SubmissionView
            s={d.submission}
            onResend={() => void navigate({ to: '/pay' })}
            onReceipt={() => void navigate({ to: '/payments' })}
          />
        )
      }
    </QueryView>
  );
}

/** MG-08 "kela olmaydi" (FR-ATT-7). */
export function GuardianAbsencePage() {
  const today = useClock().today();
  const children = useChildren();
  const [childId] = useSelectedChild(children.data?.map((c) => c.id) ?? []);
  const send = useSendAbsence(today);
  return (
    <QueryView query={children} empty={{ when: (c) => c.length === 0, title: t.childHome.empty }}>
      {(list) => (
        <>
          {send.isError && <Alert error={send.error} />}
          <AbsenceView
            childTabs={list.map((c) => ({ id: c.id, name: c.fullName }))}
            initialChild={childId ?? ''}
            sending={send.isPending}
            sent={send.isSuccess}
            onSend={(v) => send.mutate(v)}
          />
        </>
      )}
    </QueryView>
  );
}

/** MG-09 murojaatlar (FR-RPT-7). */
export function GuardianTicketsPage() {
  const me = useMe();
  const query = useMyTickets(me.id);
  const send = useSendTicket();
  return (
    <QueryView query={query}>
      {(d) => (
        <>
          {send.isError && <Alert error={send.error} />}
          <TicketsView
            tickets={d.tickets}
            sending={send.isPending}
            onSend={(text) => send.mutate({ text, openId: d.openId })}
          />
        </>
      )}
    </QueryView>
  );
}
