import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

/** Guruhlangan blok (Telegram "section" uslubi): sarlavha, ichki ro'yxat, izoh. */
export function Section({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      {title && <h2 className="px-4 text-sm uppercase tracking-wide text-text-muted">{title}</h2>}
      <ul className="overflow-hidden rounded-xl bg-bg">{children}</ul>
      {footer && <div className="px-4 text-sm text-text-muted">{footer}</div>}
    </section>
  );
}

export interface ListItemProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Chapdagi ikon/avatar. */
  before?: ReactNode;
  /** O'ngdagi qiymat (son, chip). */
  after?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

/** Ro'yxat qatori ≥ 44 px; bosiladigan bo'lsa — tugma (klaviatura va ekran o'quvchi uchun). */
export function ListItem({
  title,
  subtitle,
  before,
  after,
  chevron,
  onClick,
  disabled,
}: ListItemProps) {
  const body = (
    <>
      {before && <span className="shrink-0 text-text-muted">{before}</span>}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="line-clamp-2 break-words text-base text-text">{title}</span>
        {subtitle && <span className="line-clamp-2 text-sm text-text-muted">{subtitle}</span>}
      </span>
      {after && <span className="shrink-0 text-sm text-text-muted">{after}</span>}
      {chevron && <ChevronRight className="size-5 shrink-0 text-text-muted" aria-hidden />}
    </>
  );
  const cls = 'flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left';
  return (
    <li className="border-b border-border last:border-0">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`${cls} active:bg-surface disabled:opacity-50`}
        >
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
