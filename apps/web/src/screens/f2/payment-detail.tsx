import { formatDateShort, formatMoney, formatTime, webMessages as t } from '@lg/i18n';
import { Badge, Button, Card, CardTitle, PageHeader } from '@lg/ui-web';
import { QrCode, RotateCcw, Undo2 } from 'lucide-react';
import type { PayMethod } from './pay-entry.js';

export interface PaymentDetail {
  receiptNo: string;
  at: Date;
  student: string;
  amount: bigint;
  method: PayMethod;
  createdBy: string;
  reviewedBy?: string;
  verifyUrl: string;
  /** Ledger yozuvlari (BR-16: storno — teskari yozuv, o'chirish yo'q). */
  ledger: readonly { what: string; amount: bigint }[];
  reversed?: { reason: string };
  /** canReversePayment: shu kuni kiritilgan bo'lsa Admin; aks holda so'rov (T-119). */
  enteredToday: boolean;
}

function Actions({ isDirector, onReverse, onRefund }: Omit<Props, 'p'>) {
  return (
    <>
      <Button variant="secondary" onClick={onReverse}>
        <Undo2 className="size-4" aria-hidden />
        {t.payDetail.reverse}
      </Button>
      {isDirector && (
        <Button variant="danger" onClick={onRefund}>
          <RotateCcw className="size-4" aria-hidden />
          {t.payDetail.refund}
        </Button>
      )}
    </>
  );
}

interface Props {
  p: PaymentDetail;
  /** Faqat Direktor refund qila oladi (BR-17). */
  isDirector: boolean;
  onReverse: () => void;
  onRefund: () => void;
}

/** W-17 To'lov tafsiloti (FR-PAY-6/8/9): chek, QR, ledger; storno/refund — sabab bilan. */
export function PaymentDetailView({ p, isDirector, onReverse, onRefund }: Props) {
  return (
    <>
      <PageHeader
        title={t.payDetail.title.replace('{no}', p.receiptNo)}
        description={`${formatDateShort(p.at)} ${formatTime(p.at)} · ${p.student}`}
        actions={
          !p.reversed && (
            <Actions isDirector={isDirector} onReverse={onReverse} onRefund={onRefund} />
          )
        }
      />
      {p.reversed && (
        <Badge tone="danger" className="mb-4 text-sm">
          {t.payDetail.reversed.replace('{reason}', p.reversed.reason)}
        </Badge>
      )}
      <div className="grid grid-cols-3 gap-6">
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-base">{t.payDetail.receipt}</CardTitle>
          <p className="text-3xl font-semibold tabular-nums text-text">{formatMoney(p.amount)}</p>
          <p className="text-sm text-text-muted">{t.payEntry.methods[p.method]}</p>
          <p className="text-sm text-text-muted">
            {t.payDetail.createdBy.replace('{name}', p.createdBy)}
          </p>
          {p.reviewedBy && (
            <p className="text-sm text-text-muted">
              {t.payDetail.reviewedBy.replace('{name}', p.reviewedBy)}
            </p>
          )}
        </Card>
        <Card className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="size-5" aria-hidden />
            {t.payDetail.verify}
          </CardTitle>
          <code className="break-all text-xs text-link">{p.verifyUrl}</code>
          <p className="text-xs text-text-muted">
            {p.enteredToday ? t.payDetail.reverseHintToday : t.payDetail.reverseHintRequest}
          </p>
          <p className="text-xs text-text-muted">{t.payDetail.refundHint}</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-base">{t.payDetail.ledger}</CardTitle>
          <ul className="divide-y divide-border text-sm">
            {p.ledger.map((l) => (
              <li key={l.what} className="flex justify-between py-1.5">
                <span className="text-text">{l.what}</span>
                <span className={l.amount < 0n ? 'tabular-nums text-danger' : 'tabular-nums'}>
                  {formatMoney(l.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
