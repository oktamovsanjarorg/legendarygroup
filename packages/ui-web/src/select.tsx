import { type SelectHTMLAttributes, useId } from 'react';
import { cn } from './cn.js';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly { value: string; label: string }[];
  error?: string | null;
}

/** Tanlash maydoni (native select — klaviatura va ekran o'quvchi bepul). */
export function SelectField({ label, options, error, className, id, ...props }: Props) {
  const auto = useId();
  const sid = id ?? auto;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={sid} className="text-sm font-medium text-text">
        {label}
      </label>
      <select
        id={sid}
        aria-invalid={error ? true : undefined}
        className={cn(
          'min-h-11 rounded-md border border-border bg-bg px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30',
          error && 'border-danger',
          className,
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
