import type { LucideIcon } from 'lucide-react';

export interface TabItem {
  /** docs/ux/screens.md ekran ID'si (MT-01, MG-01 ...). */
  screen: string;
  to: string;
  label: string;
  icon: LucideIcon;
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
            onClick={() => !on && onSelect(item)}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${on ? 'text-primary' : 'text-text-muted'}`}
          >
            <Icon className="size-6" aria-hidden />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
