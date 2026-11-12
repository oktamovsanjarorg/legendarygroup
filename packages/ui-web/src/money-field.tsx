import { CURRENCY, formatMoney, parseMoney } from '@lg/i18n';
import { useId } from 'react';
import { cn } from './cn.js';

interface Props {
  label: string;
  value: bigint | null;
  onChange: (value: bigint | null) => void;
  hint?: string;
  error?: string | null;
  autoFocus?: boolean;
}

/** Summa (W-13, 11-ux §4.8): yozish paytida guruhlash (U+00A0), faqat musbat `bigint`. */
export function MoneyField({ label, value, onChange, hint, error, autoFocus }: Props) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <div
        className={cn(
          'flex min-h-12 items-center rounded-md border border-border bg-bg px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30',
          error && 'border-danger',
        )}
      >
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          value={value === null ? '' : formatMoney(value, { withCurrency: false })}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
            const v = digits === '' ? null : parseMoney(digits);
            onChange(v !== null && v > 0n ? v : null);
          }}
          className="min-w-0 flex-1 bg-transparent text-xl font-semibold tabular-nums text-text outline-none"
        />
        <span className="text-sm text-text-muted">{CURRENCY}</span>
      </div>
      {(error ?? hint) && (
        <p
          role={error ? 'alert' : undefined}
          className={cn('text-sm', error ? 'text-danger' : 'text-text-muted')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
