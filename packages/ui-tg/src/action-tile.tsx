import type { LucideIcon } from 'lucide-react';

export interface QuickAction {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Son belgisi (kutayotgan ishlar). */
  badge?: number;
  onClick: () => void;
}

/**
 * Tezkor amallar (Q-113): tab ildiz ekranlarida asosiy amal — kontent ichidagi plitka.
 * MainButton tab ildizida ishlatilmaydi: u pastki menyu ostida chiqib, menyuni siljitadi.
 */
export function QuickActions({ items }: { items: readonly QuickAction[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 desk:flex desk:flex-wrap">
      {items.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.key}
            type="button"
            onClick={a.onClick}
            aria-label={a.badge ? `${a.label} (${a.badge})` : undefined}
            className="relative flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl bg-bg p-2 text-center text-xs font-medium text-text transition-colors hover:bg-surface active:bg-surface desk:min-h-10 desk:flex-row desk:gap-2 desk:border desk:border-border desk:py-1.5 desk:pl-1.5 desk:pr-4 desk:text-sm desk:hover:border-primary/40 desk:hover:bg-bg"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary desk:size-7 desk:rounded-lg">
              <Icon className="size-5 desk:size-4" aria-hidden />
            </span>
            <span className="leading-tight">{a.label}</span>
            {a.badge ? (
              <span
                aria-hidden
                className="absolute right-2 top-2 desk:static desk:ml-1 min-w-5 rounded-full bg-danger px-1 text-[11px] font-bold leading-5 text-primary-text tabular-nums"
              >
                {a.badge > 99 ? '99+' : a.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
