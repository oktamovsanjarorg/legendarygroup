import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface SideNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export interface SideNavGroup {
  key: string;
  title?: string;
  items: readonly SideNavItem[];
}

interface SideNavProps {
  groups: readonly SideNavGroup[];
  /** Joriy yo'l: eng uzun mos prefiks faol bo'ladi. */
  active: string;
  onSelect: (item: SideNavItem) => void;
}

/** Keng ekran chegarasi (Telegram Desktop, planshet) — T-164. */
export const WIDE_QUERY = '(min-width: 900px)';

/** `true` — keng oyna: pastki menyu o'rniga yon panel. */
export function useWide(query = WIDE_QUERY): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return wide;
}

/** Eng uzun mos yo'l: `/staff/student/1` ichida «O'quvchilar» faol. */
export function activeItem(groups: readonly SideNavGroup[], path: string): string | null {
  let best: string | null = null;
  for (const g of groups)
    for (const i of g.items) {
      const hit = i.to === '/' ? path === '/' : path === i.to || path.startsWith(`${i.to}/`);
      if (hit && (best === null || i.to.length > best.length)) best = i.to;
    }
  return best;
}

/**
 * Yon panel (T-164, Q-113): keng ekranda barcha bo'limlar doim ko'rinadi — ichki ekranlarda ham.
 * Telefon kengligida ko'rsatilmaydi (u yerda pastki menyu).
 */
export function SideNav({ groups, active, onSelect }: SideNavProps) {
  const current = activeItem(groups, active);
  return (
    <nav
      aria-label="Boʻlimlar"
      className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border bg-bg p-2"
    >
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col">
          {g.title && (
            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase text-text-muted">
              {g.title}
            </p>
          )}
          {g.items.map((i) => {
            const on = i.to === current;
            const Icon = i.icon;
            return (
              <button
                key={i.to}
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => !on && onSelect(i)}
                className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-left text-sm ${on ? 'bg-primary/10 font-semibold text-primary' : 'text-text active:bg-surface'}`}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="flex-1 truncate">{i.label}</span>
                {i.badge ? (
                  <span className="rounded-full bg-danger px-1.5 text-[11px] font-bold leading-5 text-primary-text tabular-nums">
                    {i.badge > 99 ? '99+' : i.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
