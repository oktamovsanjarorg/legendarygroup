import { formatDateShort, formatTime, miniappMessages as t } from '@lg/i18n';
import {
  EmptyState,
  ListItem,
  Section,
  StatusChip,
  TextArea,
  useMainButton,
  useSecondaryButton,
} from '@lg/ui-tg';
import { useState } from 'react';

export type ApprovalType = keyof typeof t.approvals.types;

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  requestedBy: string;
  reason: string;
  /** Payload'ning odam o'qiydigan qatorlari (masalan, "Chegirma: 25%"). */
  details: readonly { label: string; value: string }[];
  /** 02 §5: 48 soat, keyin avtomatik bekor. */
  expiresAt: Date;
}

const deadline = (d: Date) =>
  t.approvals.expires.replace('{time}', `${formatDateShort(d)} ${formatTime(d)}`);

/** MS-03 Tasdiqlash so'rovlari ro'yxati (faqat Director). */
export function ApprovalsView({
  items,
  onOpen,
}: {
  items: readonly ApprovalRequest[];
  onOpen: (r: ApprovalRequest) => void;
}) {
  if (items.length === 0) return <EmptyState title={t.approvals.empty} />;
  return (
    <main className="flex flex-col gap-3 p-2 pt-3">
      <h1 className="px-2 text-2xl font-bold text-text">{t.approvals.title}</h1>
      <Section>
        {items.map((r) => (
          <ListItem
            key={r.id}
            title={t.approvals.types[r.type]}
            subtitle={
              <span className="flex flex-col">
                <span>{t.approvals.requestedBy.replace('{name}', r.requestedBy)}</span>
                <span>{deadline(r.expiresAt)}</span>
              </span>
            }
            chevron
            onClick={() => onOpen(r)}
          />
        ))}
      </Section>
    </main>
  );
}

interface DecisionProps {
  r: ApprovalRequest;
  busy?: boolean;
  onApprove: () => void;
  onReject: (comment: string) => void;
}

/** MS-03 → qaror: Tasdiqlash (MainButton) / Rad etish (SecondaryButton, izoh bilan). */
export function ApprovalDecisionView({ r, busy, onApprove, onReject }: DecisionProps) {
  const [comment, setComment] = useState('');
  useMainButton({ text: t.approvals.approve, onClick: onApprove, loading: busy });
  useSecondaryButton({
    text: t.approvals.reject,
    onClick: () => onReject(comment.trim()),
    disabled: busy,
  });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="flex flex-col gap-1 px-2">
        <h1 className="text-xl font-semibold text-text">{t.approvals.types[r.type]}</h1>
        <p className="text-sm text-text-muted">
          {t.approvals.requestedBy.replace('{name}', r.requestedBy)}
        </p>
        <StatusChip tone="warning">{deadline(r.expiresAt)}</StatusChip>
      </header>
      <Section title={t.approvals.details}>
        {r.details.map((d) => (
          <ListItem
            key={d.label}
            title={d.label}
            after={<span className="font-semibold text-text">{d.value}</span>}
          />
        ))}
      </Section>
      <Section title={t.approvals.reason}>
        <li className="px-4 py-3 text-base text-text">{r.reason}</li>
      </Section>
      <TextArea
        label={t.approvals.rejectComment}
        rows={2}
        value={comment}
        maxLength={500}
        onChange={(e) => setComment(e.target.value)}
      />
    </main>
  );
}
