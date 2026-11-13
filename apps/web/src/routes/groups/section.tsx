import { webMessages as t } from '@lg/i18n';
import { Button } from '@lg/ui-web';
import type { ReactNode } from 'react';
import { errorText } from '../../api/errors.js';
import { ConflictList } from '../../screens/f1/group-form.js';
import { conflictTexts } from './group-draft.js';

interface Props {
  title: string;
  /** Tahrirlash formasini ochuvchi tugma (yo'q — faqat ko'rish). */
  toggle?: { label: string; open: boolean; onToggle: () => void };
  children: ReactNode;
}

/** Tafsilot panelidagi bo'lim: sarlavha + ixtiyoriy "tahrirlash" tugmasi. */
export function Section({ title, toggle, children }: Props) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {toggle && (
          <Button variant="ghost" size="sm" aria-expanded={toggle.open} onClick={toggle.onToggle}>
            {toggle.open ? t.groups.detail.hide : toggle.label}
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

/** Amal xatosi: to'qnashuv bo'lsa — tushunarli ro'yxat (FR-ORG-6), aks holda server matni. */
export function ActionError({
  error,
  nameOf,
}: {
  error: unknown;
  nameOf: (id: string) => string | undefined;
}) {
  if (!error) return null;
  const conflicts = conflictTexts(error, nameOf);
  if (conflicts.length > 0) return <ConflictList conflicts={conflicts} />;
  return (
    <p role="alert" className="text-sm text-danger">
      {errorText(error)}
    </p>
  );
}
