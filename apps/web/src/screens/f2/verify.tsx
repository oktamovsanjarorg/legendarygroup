import { formatDateShort, formatMoney, webMessages as t } from '@lg/i18n';
import { Card } from '@lg/ui-web';
import { CheckCircle2, SearchX, XCircle } from 'lucide-react';

/** Ommaviy natija — PII yo'q (FR-PAY-8): raqam, sana, summa, holat, markaz. */
export type VerifyResult =
  | { kind: 'valid' | 'reversed'; number: string; date: Date; amount: bigint; center: string }
  | { kind: 'not_found' };

const ICON = {
  valid: <CheckCircle2 className="size-12 text-success" aria-hidden />,
  reversed: <XCircle className="size-12 text-danger" aria-hidden />,
};

/** W-34 Chekni tekshirish (`/verify/<token>`, QR): kirishsiz ommaviy sahifa. */
export function VerifyView({ r }: { r: VerifyResult }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6">
      <Card className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <p className="text-sm font-semibold text-text-muted">{t.verifyPage.title}</p>
        {r.kind === 'not_found' ? (
          <>
            <SearchX className="size-12 text-text-muted" aria-hidden />
            <h1 className="text-xl font-semibold text-text">{t.verifyPage.notFound}</h1>
            <p className="text-sm text-text-muted">{t.verifyPage.notFoundHint}</p>
          </>
        ) : (
          <>
            {ICON[r.kind]}
            <h1 className="text-xl font-semibold text-text">
              {r.kind === 'valid' ? t.verifyPage.valid : t.verifyPage.reversed}
            </h1>
            <dl className="grid w-full grid-cols-2 gap-y-2 text-left text-sm">
              <dt className="text-text-muted">{t.verifyPage.number}</dt>
              <dd className="text-right font-medium tabular-nums">{r.number}</dd>
              <dt className="text-text-muted">{t.verifyPage.date}</dt>
              <dd className="text-right tabular-nums">{formatDateShort(r.date)}</dd>
              <dt className="text-text-muted">{t.verifyPage.amount}</dt>
              <dd className="text-right font-medium tabular-nums">{formatMoney(r.amount)}</dd>
              <dt className="text-text-muted">{t.verifyPage.center}</dt>
              <dd className="text-right">{r.center}</dd>
            </dl>
            <p className="text-xs text-text-muted">{t.verifyPage.privacy}</p>
          </>
        )}
      </Card>
    </main>
  );
}
