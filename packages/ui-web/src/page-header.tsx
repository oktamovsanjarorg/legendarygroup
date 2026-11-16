import { webMessages as t } from '@lg/i18n';
import { HelpCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Yordam boʻlimi havolasi (W-36): `/help#<id>` ga eltuvchi «?» ikonka. */
  help?: string;
}

/** Sahifa sarlavhasi: nom, izoh, o'ngda amallar (asosiy amal — bitta, primary). */
export function PageHeader({ title, description, actions, help }: PageHeaderProps) {
  const helpHref = help
    ? help.startsWith('/help')
      ? help
      : `/help#${help.replace(/^#/, '')}`
    : undefined;

  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-text">{title}</h1>
          {helpHref && (
            <a
              href={helpHref}
              aria-label={t.help.open}
              title={t.help.open}
              className="inline-flex items-center rounded text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <HelpCircle className="size-5 shrink-0" aria-hidden />
            </a>
          )}
        </div>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
