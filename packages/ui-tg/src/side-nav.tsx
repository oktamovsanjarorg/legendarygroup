import { ChevronDown, type LucideIcon, Search } from 'lucide-react';
import { type ReactNode, useState } from 'react';

export interface SideNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export interface SideNavGroup {
  key: string;
  /** Sarlavhasiz guruh — doim ochiq (asosiy bo'limlar). */
  title?: string;
  items: readonly SideNavItem[];
}

export interface SideNavSearch {
  label: string;
  /** Klaviatura yorlig'i, masalan «Ctrl K». */
  hint?: string;
  onClick: () => void;
}

interface SideNavProps {
  groups: readonly SideNavGroup[];
  /** Joriy yo'l: eng uzun mos prefiks faol bo'ladi. */
  active: string;
  onSelect: (item: SideNavItem) => void;
  /** Yuqorida: logo va nom. */
  brand?: ReactNode;
  /** Pastda: foydalanuvchi. */
  footer?: ReactNode;
  search?: SideNavSearch;
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

const STORE = 'lg_side_open';

/** Ochiq bo'limlar — shu qurilmada eslab qolinadi (xatoda — hammasi yopiq, faol bo'lim ochiq). */
function useOpenSections() {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORE) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(STORE, JSON.stringify([...next]));
      } catch {
        // Saqlab bo'lmasa — faqat shu sessiyada.
      }
      return next;
    });
  return { open, toggle };
}

function Badge({ n }: { n: number }) {
  return (
    <span className="min-w-5 rounded-full bg-danger px-1.5 text-center text-[11px] font-bold leading-5 text-primary-text tabular-nums">
      {n > 99 ? '99+' : n}
    </span>
  );
}

function Item({ item, on, onSelect }: { item: SideNavItem; on: boolean; onSelect: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      aria-current={on ? 'page' : undefined}
      onClick={() => !on && onSelect()}
      className={`group flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors ${
        on
          ? 'bg-primary/10 font-semibold text-primary'
          : 'text-text hover:bg-surface active:bg-surface'
      }`}
    >
      <Icon
        className={`size-[18px] shrink-0 ${on ? 'text-primary' : 'text-text-muted group-hover:text-text'}`}
        aria-hidden
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge ? <Badge n={item.badge} /> : null}
    </button>
  );
}

function Group(p: {
  group: SideNavGroup;
  current: string | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (i: SideNavItem) => void;
}) {
  const { group, current } = p;
  const hasActive = group.items.some((i) => i.to === current);
  const expanded = !group.title || p.open || hasActive;
  const waiting = group.items.reduce((n, i) => n + (i.badge ?? 0), 0);
  return (
    <div className="flex flex-col gap-0.5">
      {group.title && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={p.onToggle}
          disabled={hasActive}
          className="flex h-8 items-center gap-1 rounded-md px-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted hover:text-text disabled:hover:text-text-muted"
        >
          <span className="flex-1 text-left">{group.title}</span>
          {!expanded && waiting > 0 && <Badge n={waiting} />}
          <ChevronDown
            className={`size-3.5 transition-transform ${expanded ? '' : '-rotate-90'}`}
            aria-hidden
          />
        </button>
      )}
      {expanded &&
        group.items.map((i) => (
          <Item key={i.to} item={i} on={i.to === current} onSelect={() => p.onSelect(i)} />
        ))}
    </div>
  );
}

/**
 * Yon panel (T-164, T-174): kompyuterda barcha bo'limlar — asosiylari doim, qolganlari yig'iladigan
 * guruhlarda (faol bo'lim ochiq turadi). Tepada logo va qidiruv, pastda foydalanuvchi.
 * Telefon kengligida ko'rsatilmaydi (u yerda pastki menyu).
 */
export function SideNav({ groups, active, onSelect, brand, footer, search }: SideNavProps) {
  const current = activeItem(groups, active);
  const { open, toggle } = useOpenSections();
  return (
    <nav
      aria-label="Boʻlimlar"
      className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-bg"
    >
      {brand && <div className="px-4 pb-2 pt-4">{brand}</div>}
      {search && (
        <button
          type="button"
          onClick={search.onClick}
          className="mx-3 my-2 flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 text-[13px] text-text-muted transition-colors hover:border-primary/40 hover:text-text"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 truncate text-left">{search.label}</span>
          {search.hint && (
            <kbd className="rounded border border-border bg-bg px-1.5 font-sans text-[11px] leading-5">
              {search.hint}
            </kbd>
          )}
        </button>
      )}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-2 py-2">
        {groups.map((g) => (
          <Group
            key={g.key}
            group={g}
            current={current}
            open={open.has(g.key)}
            onToggle={() => toggle(g.key)}
            onSelect={onSelect}
          />
        ))}
      </div>
      {footer && <div className="border-t border-border p-2">{footer}</div>}
    </nav>
  );
}
