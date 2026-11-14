import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  placeholder: string;
  clearLabel: string;
  onChange: (value: string) => void;
}

/** Qidiruv maydoni (MS-04): `type=search`, tozalash tugmasi; normalizatsiya — chaqiruvchida (normalizeUz). */
export function SearchField({ value, placeholder, clearLabel, onChange }: Props) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-xl bg-bg px-3">
      <Search className="size-5 shrink-0 text-text-muted" aria-hidden />
      <input
        type="search"
        enterKeyHint="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => onChange('')}
          className="p-1 text-text-muted"
        >
          <X className="size-5" aria-hidden />
        </button>
      )}
    </div>
  );
}
