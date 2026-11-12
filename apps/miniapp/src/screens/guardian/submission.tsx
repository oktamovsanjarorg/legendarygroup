import { formatDateShort, formatTime, miniappMessages as t } from '@lg/i18n';
import { ListItem, MoneyText, Section, StateShell, useMainButton } from '@lg/ui-tg';
import { CheckCircle2, FileText, Hourglass, XCircle } from 'lucide-react';

/** BR-13: pending_review → confirmed | rejected (sabab bilan). */
export type SubmissionStatus =
  | { kind: 'pending_review' }
  | { kind: 'confirmed'; receiptNo: string }
  | { kind: 'rejected'; reason: string };

export interface Submission {
  childName: string;
  amount: bigint;
  sentAt: Date;
  status: SubmissionStatus;
}

const LOOK = {
  pending_review: {
    icon: <Hourglass className="size-10 text-warning" aria-hidden />,
    title: t.submission.pending,
  },
  confirmed: {
    icon: <CheckCircle2 className="size-10 text-success" aria-hidden />,
    title: t.submission.confirmed,
  },
  rejected: {
    icon: <XCircle className="size-10 text-danger" aria-hidden />,
    title: t.submission.rejected,
  },
};

interface Props {
  s: Submission;
  onResend: () => void;
  onReceipt: () => void;
}

/** MG-07 Chek holati: rad etilsa — sabab va "Qayta yuborish" (MainButton). */
export function SubmissionView({ s, onResend, onReceipt }: Props) {
  useMainButton({
    text: t.submission.resend,
    onClick: onResend,
    visible: s.status.kind === 'rejected',
  });
  const look = LOOK[s.status.kind];
  const hint =
    s.status.kind === 'pending_review'
      ? t.submission.pendingHint
      : s.status.kind === 'rejected'
        ? t.submission.reason.replace('{reason}', s.status.reason)
        : undefined;
  return (
    <main className="flex flex-col gap-2 p-2 pb-6">
      <StateShell icon={look.icon} title={look.title} hint={hint}>
        <MoneyText amount={s.amount} className="text-2xl font-bold" />
        <span className="text-sm text-text-muted">
          {s.childName} ·{' '}
          {t.submission.sentAt.replace(
            '{time}',
            `${formatDateShort(s.sentAt)} ${formatTime(s.sentAt)}`,
          )}
        </span>
      </StateShell>
      {s.status.kind === 'confirmed' && (
        <Section>
          <ListItem
            before={<FileText className="size-5" aria-hidden />}
            title={t.submission.receiptPdf}
            subtitle={s.status.receiptNo}
            chevron
            onClick={onReceipt}
          />
        </Section>
      )}
    </main>
  );
}
