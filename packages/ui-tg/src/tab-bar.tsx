import type { LucideIcon } from 'lucide-react';

export interface TabItem {
  /** docs/ux/screens.md ekran ID'si (MT-01, MG-01 ...). */
  screen: string;
  to: string;
  label: string;
  icon: LucideIcon;
  /** Son belgisi (masalan, navbatdagi cheklar). */
  badge?: number;
}

interface TabBarProps {
  items: readonly TabItem[];
  active: string;
  onSelect: (item: TabItem) => void;
}

/**
 * Pastki menyu (11-ux §2: rolga qarab 4 tab). Faqat tab ildiz ekranlarida ko'rinadi —
 * ichki ekranlarda `BackButton` va `MainButton` bor. Pastki xavfsiz zona hisobga olinadi.
 */
export function TabBar({ items, active, onSelect }: TabBarProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-bg"
      style={{ paddingBottom: 'var(--lg-safe-bottom, 0px)' }}
    >
      {items.map((item) => {
        const on = item.to === active;
        const Icon = item.icon;
        return (
          <button
            key={item.to}
            type="button"
            aria-current={on ? 'page' : undefined}
            aria-label={item.badge ? `${item.label} (${item.badge})` : undefined}
            onClick={() => !on && onSelect(item)}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${on ? 'text-primary' : 'text-text-muted'}`}
          >
            <span className="relative">
              <Icon className="size-6" aria-hidden />
              {item.badge ? (
                <span
                  aria-hidden
                  className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-primary-text tabular-nums"
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
