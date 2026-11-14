import { formatMoney, webMessages as t } from '@lg/i18n';
import { Button, Card, CardTitle, cn, MoneyField, PageHeader } from '@lg/ui-web';
import { CheckCircle2, Printer } from 'lucide-react';
import type { KeyboardEvent } from 'react';

export type PayMethod = keyof typeof t.payEntry.methods;
const METHODS = Object.keys(t.payEntry.methods) as PayMethod[];

export interface PayStudent {
  id: string;
  name: string;
  code: string;
  group: string;
  debt: bigint;
}

/** Server preview'i (T-204: `allocateFifo` — packages/domain; UI faqat ko'rsatadi, 03 §2). */
export interface AllocationPreview {
  parts: readonly { month: string; amount: bigint; closes: boolean }[];
  advance: bigint;
}

export interface PayEntryState {
  query: string;
  results: readonly PayStudent[];
  highlighted: number;
  student: PayStudent | null;
  amount: bigint | null;
  method: PayMethod;
  preview: AllocationPreview | null;
  saving?: boolean;
  /** Saqlangach: chek raqami. */
  savedReceipt?: string;
}

export interface PayEntryProps {
  s: PayEntryState;
  onQuery: (q: string) => void;
  onPick: (st: PayStudent) => void;
  onAmount: (v: bigint | null) => void;
  onMethod: (m: PayMethod) => void;
  onSubmit: () => void;
  onNext: () => void;
}

function StudentPicker({ s, onQuery, onPick }: Pick<PayEntryProps, 's' | 'onQuery' | 'onPick'>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="pay-student" className="text-sm font-medium text-text">
        {t.payEntry.student}
      </label>
      <input
        id="pay-student"
        autoFocus={!s.student}
        role="combobox"
        aria-expanded={s.results.length > 0}
        aria-controls="pay-student-list"
        placeholder={t.payEntry.studentPlaceholder}
        value={s.student ? `${s.student.name} · ${s.student.code}` : s.query}
        onChange={(e) => onQuery(e.target.value)}
        className="min-h-11 rounded-md border border-border bg-bg px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      {!s.student && s.results.length > 0 && (
        <ul
          id="pay-student-list"
          role="listbox"
          className="overflow-hidden rounded-md border border-border bg-bg shadow-md"
        >
          {s.results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === s.highlighted}>
              <button
                type="button"
                onClick={() => onPick(r)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left text-sm',
                  i === s.highlighted ? 'bg-primary/10' : 'hover:bg-surface',
                )}
              >
                <span>
                  <span className="font-medium text-text">{r.name}</span>{' '}
                  <span className="text-text-muted">
                    · {r.code} · {r.group}
                  </span>
                </span>
                {r.debt > 0n && (
                  <span className="tabular-nums text-danger">{formatMoney(r.debt)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MethodPicker({ value, onMethod }: { value: PayMethod; onMethod: (m: PayMethod) => void }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-text">{t.payEntry.method}</legend>
      <div className="grid grid-cols-4 gap-2" role="radiogroup">
        {METHODS.map((m, i) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={m === value}
            onClick={() => onMethod(m)}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded-md border text-sm',
              m === value
                ? 'border-primary bg-primary/10 font-semibold text-text'
                : 'border-border text-text-muted hover:bg-surface',
            )}
          >
            <kbd className="rounded border border-border px-1 text-xs">{i + 1}</kbd>
            {t.payEntry.methods[m]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Klaviatura: Enter — saqlash, Esc — keyingi to'lov, 1–4 — usul (summa maydonidan tashqarida). */
export function payKeys(p: PayEntryProps, e: KeyboardEvent): void {
  if (e.key === 'Enter' && p.s.student && p.s.amount !== null && !p.s.saving) {
    e.preventDefault();
    p.onSubmit();
  } else if (e.key === 'Escape' && p.s.savedReceipt) p.onNext();
  else if (/^[1-4]$/.test(e.key) && !(e.target instanceof HTMLInputElement)) {
    const m = METHODS[Number(e.key) - 1];
    if (m) p.onMethod(m);
  }
}

function SavedCard({ receipt, onNext }: { receipt: string; onNext: () => void }) {
  return (
    <Card className="flex flex-col items-start gap-3 border-success/40 bg-success-bg">
      <p className="flex items-center gap-2 font-medium text-success">
        <CheckCircle2 className="size-5" aria-hidden />
        {t.payEntry.done.replace('{no}', receipt)}
      </p>
      <span className="flex gap-2">
        <Button variant="secondary">
          <Printer className="size-4" aria-hidden />
          {t.payEntry.printReceipt}
        </Button>
        <Button onClick={onNext}>{t.payEntry.next}</Button>
      </span>
    </Card>
  );
}

function PreviewCard({ s }: { s: PayEntryState }) {
  if (!s.student) return null;
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="text-base">{t.payEntry.allocation}</CardTitle>
      {s.student.debt === 0n && <p className="text-sm text-text-muted">{t.payEntry.noDebt}</p>}
      <ul className="flex flex-col gap-2 text-sm">
        {s.preview?.parts.map((p) => (
          <li key={p.month} className="flex justify-between">
            <span className="text-text">{p.month}</span>
            <span className={cn('tabular-nums', p.closes ? 'text-success' : 'text-warning')}>
              {formatMoney(p.amount)}
            </span>
          </li>
        ))}
      </ul>
      {s.preview && s.preview.advance > 0n && (
        <p className="text-sm font-medium text-link">
          {t.payEntry.advance.replace('{amount}', formatMoney(s.preview.advance))}
        </p>
      )}
      <Button variant="link" className="self-start">
        {t.payEntry.manual}
      </Button>
    </Card>
  );
}

/** W-13 To'lov kiritish (FR-PAY-2): ≤ 30 s, sichqonchasiz; `Alt+P` istalgan sahifadan. */
export function PayEntryView(p: PayEntryProps) {
  const { s } = p;
  return (
    <div onKeyDown={(e) => payKeys(p, e)}>
      <PageHeader title={t.payEntry.title} description={t.payEntry.hotkey} />
      <div className="grid grid-cols-5 gap-6">
        <Card className="col-span-3 flex flex-col gap-5">
          <StudentPicker s={s} onQuery={p.onQuery} onPick={p.onPick} />
          <MoneyField
            label={t.payEntry.amount}
            value={s.amount}
            onChange={p.onAmount}
            autoFocus={Boolean(s.student)}
          />
          <MethodPicker value={s.method} onMethod={p.onMethod} />
          {s.savedReceipt ? (
            <SavedCard receipt={s.savedReceipt} onNext={p.onNext} />
          ) : (
            <Button
              size="full"
              loading={s.saving}
              disabled={!s.student || s.amount === null}
              onClick={p.onSubmit}
            >
              {t.payEntry.submit}
            </Button>
          )}
        </Card>
        <div className="col-span-2">
          <PreviewCard s={s} />
        </div>
      </div>
    </div>
  );
}
