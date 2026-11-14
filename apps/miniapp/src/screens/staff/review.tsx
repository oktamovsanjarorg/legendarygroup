import { formatMoney, formatTime, miniappMessages as t } from '@lg/i18n';
import {
  ActionSheet,
  EmptyState,
  ImageViewer,
  MoneyInput,
  useHaptic,
  useMainButton,
  useSecondaryButton,
} from '@lg/ui-tg';
import { AlertTriangle, Info, Lock } from 'lucide-react';
import { type ReactNode, useState } from 'react';

export interface QueueItem {
  id: string;
  imageUrl: string;
  studentName: string;
  groupName: string;
  guardianName: string;
  amount: bigint;
  comment?: string;
  sentAt: Date;
  /** BR-15: o'xshash chek (ogohlantirish, bloklamaydi). */
  duplicateOf?: { sentAt: Date; amount: bigint };
  /** canReviewSubmission: boshqa Admin ochib turibdi (yumshoq lock 5 daq). */
  lockedBy?: string;
}

type ReasonKey = keyof typeof t.review.reasons;

function Note({ tone, icon, children }: { tone: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={`flex gap-2 rounded-xl p-3 text-sm ${tone}`}>
      {icon}
      <span>{children}</span>
    </div>
  );
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
}

/** Rad etish sababi (majburiy, FR-PAY-4): shablon yoki o'z matni — ota-onaga yuboriladi. */
function RejectSheet({ open, onClose, onReject }: SheetProps) {
  const [custom, setCustom] = useState('');
  const templates = (Object.keys(t.review.reasons) as ReasonKey[]).map((k) => ({
    label: t.review.reasons[k],
    tone: 'danger' as const,
    onSelect: () => onReject(t.review.reasons[k]),
  }));
  const own = custom.trim();
  return (
    <ActionSheet
      open={open}
      title={t.review.rejectTitle}
      cancelLabel={t.attendance.cancel}
      onClose={onClose}
      actions={
        own.length >= 3
          ? [
              {
                label: `${t.review.reject}: «${own}»`,
                tone: 'danger',
                onSelect: () => onReject(own),
              },
              ...templates,
            ]
          : templates
      }
    >
      <div className="border-t border-border px-4 py-3">
        <input
          aria-label={t.review.otherReason}
          placeholder={t.review.otherReason}
          value={custom}
          maxLength={300}
          onChange={(e) => setCustom(e.target.value)}
          className="min-h-11 w-full rounded-lg bg-surface px-3 text-base text-text outline-none placeholder:text-text-muted"
        />
      </div>
    </ActionSheet>
  );
}

/** Sarlavha, navbatdagi o'rni, lock va dublikat ogohlantirishlari. */
function ReviewHeader({
  item,
  position,
  total,
}: {
  item: QueueItem;
  position: number;
  total: number;
}) {
  return (
    <>
      <header className="flex items-baseline justify-between px-2">
        <h1 className="text-xl font-semibold text-text">{item.studentName}</h1>
        <span className="text-sm tabular-nums text-text-muted">
          {t.review.position.replace('{i}', String(position)).replace('{n}', String(total))}
        </span>
      </header>
      <p className="-mt-2 px-2 text-sm text-text-muted">
        {item.groupName} ·{' '}
        {t.review.sentBy
          .replace('{name}', item.guardianName)
          .replace('{time}', formatTime(item.sentAt))}
      </p>
      {item.lockedBy && (
        <Note
          tone="bg-surface-alt text-text-muted"
          icon={<Lock className="size-5 shrink-0" aria-hidden />}
        >
          {t.review.locked.replace('{name}', item.lockedBy)}
        </Note>
      )}
      {item.duplicateOf && (
        <Note
          tone="bg-warning-bg text-warning"
          icon={<AlertTriangle className="size-5 shrink-0" aria-hidden />}
        >
          {t.review.duplicate
            .replace('{time}', formatTime(item.duplicateOf.sentAt))
            .replace('{amount}', formatMoney(item.duplicateOf.amount))}
        </Note>
      )}
    </>
  );
}

interface Props {
  item: QueueItem | null;
  position: number;
  total: number;
  busy?: boolean;
  onApprove: (id: string, amount: bigint) => void;
  onReject: (id: string, reason: string) => void;
}

/**
 * MS-02 Chek navbati (FR-PAY-4, BR-13/14/15): ≤ 3 teginish — bildirishnoma → ochish →
 * **Tasdiqlash**. Summa chekdagi haqiqiy summaga tahrirlanadi (audit). Rad etish — sabab shabloni.
 */
function ReviewScreen({ item, position, total, busy, onApprove, onReject }: Props) {
  const [amount, setAmount] = useState<bigint | null>(item?.amount ?? null);
  const [rejecting, setRejecting] = useState(false);
  const h = useHaptic();
  const locked = Boolean(item?.lockedBy);
  useMainButton({
    text: t.review.approve,
    onClick: () => item && amount !== null && onApprove(item.id, amount),
    disabled: amount === null || locked,
    loading: busy,
    visible: item !== null,
  });
  useSecondaryButton({
    text: t.review.reject,
    onClick: () => setRejecting(true),
    disabled: locked || busy,
    visible: item !== null,
  });
  if (!item) return <EmptyState title={t.review.empty} hint={t.review.emptyHint} />;
  const reject = (reason: string) => {
    setRejecting(false);
    h.warning();
    onReject(item.id, reason);
  };
  return (
    <main className="flex flex-col gap-3 p-2 pt-3 pb-6">
      <ReviewHeader item={item} position={position} total={total} />
      <ImageViewer
        src={item.imageUrl}
        alt={item.studentName}
        hint={t.review.zoomHint}
        errorLabel={t.review.imageError}
      />
      {item.comment && (
        <p className="px-2 text-sm text-text">{t.review.comment.replace('{text}', item.comment)}</p>
      )}
      <MoneyInput label={t.review.amount} value={amount} onChange={setAmount} />
      <Note tone="bg-bg text-text-muted" icon={<Info className="size-5 shrink-0" aria-hidden />}>
        {t.review.bankReminder}
      </Note>
      <RejectSheet open={rejecting} onClose={() => setRejecting(false)} onReject={reject} />
    </main>
  );
}

/**
 * Har chek uchun holat (summa tahriri, sabab) yangidan: navbat keyingisiga o'tganda oldingi
 * chekning summasi qolib ketmasin — `key` bilan qayta yaratiladi.
 */
export function ReviewView(props: Props) {
  return <ReviewScreen key={props.item?.id ?? 'empty'} {...props} />;
}
