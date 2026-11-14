import { CURRENCY, formatMoney, parseMoney } from '@lg/i18n';
import { useId } from 'react';

interface Props {
  label: string;
  /** `null` — bo'sh yoki noto'g'ri. */
  value: bigint | null;
  onChange: (value: bigint | null) => void;
  hint?: string;
  error?: string | null;
}

/**
 * Summa maydoni (11-ux §4.8): raqamli klaviatura, yozish paytida guruhlash (U+00A0),
 * faqat musbat butun so'm (`bigint`, float yo'q — CLAUDE.md "Pul").
 */
export function MoneyInput({ label, value, onChange, hint, error }: Props) {
  const id = useId();
  const shown = value === null ? '' : formatMoney(value, { withCurrency: false });
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="px-4 text-sm uppercase tracking-wide text-text-muted">
        {label}
      </label>
      <div className="flex items-center rounded-xl bg-bg px-4">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          value={shown}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
            const v = digits === '' ? null : parseMoney(digits);
            onChange(v !== null && v > 0n ? v : null);
          }}
          className="min-h-14 min-w-0 flex-1 bg-transparent text-2xl font-semibold tabular-nums text-text outline-none"
        />
        <span className="text-base text-text-muted">{CURRENCY}</span>
      </div>
      {(error ?? hint) && (
        <p
          role={error ? 'alert' : undefined}
          className={`px-4 text-sm ${error ? 'text-danger' : 'text-text-muted'}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
