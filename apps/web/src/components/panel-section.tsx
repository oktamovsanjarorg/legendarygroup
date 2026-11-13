import { webMessages as t } from '@lg/i18n';
import { Button } from '@lg/ui-web';
import type { ReactNode } from 'react';
import { errorText } from '../api/errors.js';

interface Props {
  title: string;
  /** Formani ochuvchi tugma (yo'q — faqat ko'rish). */
  toggle?: { label: string; open: boolean; onToggle: () => void };
  children?: ReactNode;
}

/** O'ng paneldagi bo'lim: sarlavha + ixtiyoriy "ochish/yopish" tugmasi. */
export function Section({ title, toggle, children }: Props) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {toggle && (
          <Button variant="ghost" size="sm" aria-expanded={toggle.open} onClick={toggle.onToggle}>
            {toggle.open ? t.common.close : toggle.label}
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

/** Amal xatosi — server matni (i18n'dan). */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {errorText(error)}
    </p>
  );
}
