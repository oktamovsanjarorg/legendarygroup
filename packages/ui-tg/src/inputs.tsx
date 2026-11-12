import { type TextareaHTMLAttributes, useId } from 'react';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | null;
}

/** Ko'p qatorli matn (izoh, e'lon, fikr) — yorliq ko'rinadi, xato maydon ostida (11-ux §4.8). */
export function TextArea({ label, error, id, className = '', ...props }: TextAreaProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="px-4 text-sm uppercase tracking-wide text-text-muted">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={5}
        aria-invalid={error ? true : undefined}
        className={`min-h-28 w-full resize-none rounded-xl bg-bg p-4 text-base text-text outline-none placeholder:text-text-muted ${className}`}
        {...props}
      />
      {error && (
        <p role="alert" className="px-4 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** Ikki-uch variantdan tanlash (masalan, izoh ko'rinishi) — radio guruh semantikasi. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-surface-alt p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-10 flex-1 rounded-lg px-2 text-sm font-medium ${o.value === value ? 'bg-bg text-text shadow-sm' : 'text-text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
