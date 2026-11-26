import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

const pill = (on: boolean) =>
  `h-9 rounded-full border text-[13px] font-medium transition-colors ${
    on
      ? 'border-primary/40 bg-primary/10 text-primary'
      : 'border-border bg-bg text-text hover:border-primary/30'
  }`;

interface FilterSelectProps<T extends string> {
  /** Ekran o'quvchisi uchun nom («Fan», «Tartib»). */
  label: string;
  icon: LucideIcon;
  value: T;
  /** Sukut qiymati — tanlanmagan ko'rinishda (och fon emas). */
  defaultValue: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/**
 * Ixcham filtr (T-178): pill ko'rinishidagi tanlash — ichida tizimning `select`i (telefonda
 * native ro'yxat, kompyuterda dropdown). Sukutdan farqli qiymat — ajralib turadi.
 */
export function FilterSelect<T extends string>(p: FilterSelectProps<T>) {
  const Icon = p.icon;
  const on = p.value !== p.defaultValue;
  const current = p.options.find((o) => o.value === p.value)?.label ?? '';
  return (
    <label
      className={`${pill(on)} relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 pl-3 pr-2.5 focus-within:ring-2 focus-within:ring-primary/40`}
    >
      <Icon className={`size-4 shrink-0 ${on ? 'text-primary' : 'text-text-muted'}`} aria-hidden />
      <span className="max-w-44 truncate">{current}</span>
      <ChevronDown className="size-3.5 shrink-0 text-text-muted" aria-hidden />
      {/* Ko'rinmas tizim tanlovi — pill kengligi tanlangan matn bo'yicha. */}
      <select
        aria-label={p.label}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value as T)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {p.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Yoqiladigan filtr («Arxiv», «Qarzi bor»). */
export function FilterToggle(p: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={p.on}
      onClick={() => p.onChange(!p.on)}
      className={`${pill(p.on)} shrink-0 px-4`}
    >
      {p.label}
    </button>
  );
}

/** Filtrlar qatori: telefonda gorizontal suriladi, kompyuterda o'raladi. */
export function FilterBar({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-0.5 desk:mx-0 desk:flex-wrap desk:px-0"
    >
      {children}
    </div>
  );
}
