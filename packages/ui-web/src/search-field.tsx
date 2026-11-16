import { Search, X } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { cn } from './cn.js';

export interface SearchFieldProps {
  value: string;
  placeholder?: string;
  clearLabel?: string;
  onChange: (value: string) => void;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Qidiruv maydoni (`type=search`, tozalash tugmasi).
 * Normalizatsiya — chaqiruvchida (`normalizeUz`).
 */
export function SearchField({
  value,
  placeholder = '',
  clearLabel = 'Tozalash',
  onChange,
  className,
  autoFocus,
}: SearchFieldProps) {
  return (
    <div
      className={cn(
        'flex min-h-11 items-center gap-2 rounded-md border border-border bg-bg px-3 text-sm text-text focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30',
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
      <input
        type="search"
        enterKeyHint="search"
        autoFocus={autoFocus}
        aria-label={placeholder || undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => onChange('')}
          className="rounded p-1 text-text-muted hover:text-text"
        >
          <X className="size-4 shrink-0" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
