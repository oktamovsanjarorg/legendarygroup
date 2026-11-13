import { webMessages as t } from '@lg/i18n';
import { Button, Drawer } from '@lg/ui-web';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  formId: string;
  /** Tahrirlanayotgan yozuv (yangi bo'lsa — `undefined`). */
  existing?: { name: string; archived: boolean };
  pending: boolean;
  error: string | null;
  onArchive: (action: 'archive' | 'restore') => void;
  onClose: () => void;
  children: ReactNode;
}

/** Kurs/xona paneli qobig'i: saqlash, arxivlash (tasdiq bilan), arxivdagi yozuv — faqat o'qish. */
export function OrgDrawer(p: Props) {
  const archived = p.existing?.archived ?? false;
  const name = p.existing?.name ?? '';
  const archive = () =>
    window.confirm(t.courses.form.confirmArchive.replace('{name}', name)) && p.onArchive('archive');
  const footer = (
    <>
      {p.existing && !archived && (
        <Button variant="ghost" className="mr-auto" disabled={p.pending} onClick={archive}>
          {t.common.archive}
        </Button>
      )}
      <Button variant="secondary" onClick={p.onClose}>
        {t.common.cancel}
      </Button>
      {archived ? (
        <Button loading={p.pending} onClick={() => p.onArchive('restore')}>
          {t.common.restore}
        </Button>
      ) : (
        <Button type="submit" form={p.formId} loading={p.pending}>
          {t.common.save}
        </Button>
      )}
    </>
  );
  return (
    <Drawer open title={p.title} closeLabel={t.common.close} onClose={p.onClose} footer={footer}>
      <div className="flex flex-col gap-4">
        {archived && <p className="text-sm text-text-muted">{t.courses.form.archivedNote}</p>}
        {p.children}
        {p.error && (
          <p role="alert" className="text-sm text-danger">
            {p.error}
          </p>
        )}
      </div>
    </Drawer>
  );
}

/** Zod xatolari → maydon yonidagi matn (birinchi yo'l bo'lagi — maydon nomi). */
export function fieldErrors<K extends string>(
  issues: readonly { path: PropertyKey[] }[],
  texts: Record<K, string>,
): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const i of issues) {
    const field = String(i.path[0]);
    if (field in texts) out[field as K] = texts[field as K];
  }
  return out;
}
