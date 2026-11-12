import { cn } from './cn.js';

interface Props<T extends string> {
  label: string;
  value: T;
  items: readonly { value: T; label: string; count?: number }[];
  onChange: (v: T) => void;
}

/** Bo'limlar/filtrlar (tablist): faol — chiziq bilan; son — ixtiyoriy. */
export function Tabs<T extends string>({ label, value, items, onChange }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className="mb-4 flex gap-1 border-b border-border">
      {items.map((i) => {
        const on = i.value === value;
        return (
          <button
            key={i.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(i.value)}
            className={cn(
              '-mb-px flex min-h-10 items-center gap-2 border-b-2 px-3 text-sm',
              on
                ? 'border-primary font-semibold text-text'
                : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {i.label}
            {i.count !== undefined && (
              <span className="rounded-full bg-surface-alt px-1.5 text-xs tabular-nums text-text-muted">
                {i.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
