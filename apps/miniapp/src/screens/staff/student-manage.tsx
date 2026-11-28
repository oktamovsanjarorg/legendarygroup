import { miniappMessages as t } from '@lg/i18n';
import { ActionSheet, ListItem, Section } from '@lg/ui-tg';
import { Archive, ArchiveRestore, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { StudentManage } from '../../data/staff-student.js';

const c = t.studentCard;

export interface StudentManageProps {
  m: StudentManage;
  busy: boolean;
  /** A'zolik ekrani (MS-23a): koʻchirish, muzlatish, chegirma, chiqarish. */
  onOpen: (enrollmentId: string) => void;
  onEnroll?: () => void;
  onGuardian?: (guardianId: string) => void;
  onAddGuardian?: () => void;
  onArchive: () => void;
  onRestore: () => void;
  /** Q-124: faqat `student.delete` (Director) — arxivdagi o'quvchini butunlay o'chirish. */
  onDelete?: () => void;
}

/** MS-05 guruhlar (`student.manage` bo'lsa): guruhni bosish — a'zolik amallari. */
export function ManageGroups({
  m,
  onOpen,
  onEnroll,
}: Pick<StudentManageProps, 'm' | 'onOpen' | 'onEnroll'>) {
  const add = m.archived ? undefined : onEnroll;
  if (m.groups.length === 0 && !add) return null;
  return (
    <Section title={c.groups} footer={m.groups.length > 0 ? t.staffProfile.groupsHint : undefined}>
      {m.groups.map((g) => (
        <ListItem
          key={g.enrollmentId}
          title={g.name}
          subtitle={g.text}
          chevron
          onClick={() => onOpen(g.enrollmentId)}
        />
      ))}
      {add && (
        <ListItem
          before={<Plus className="size-5 text-link" aria-hidden />}
          title={<span className="text-link">{t.staffProfile.addGroup}</span>}
          onClick={add}
        />
      )}
    </Section>
  );
}

/** FR-STU-3: a'zolik tarixi. */
export function PastGroups({ m, onOpen }: Pick<StudentManageProps, 'm' | 'onOpen'>) {
  if (m.past.length === 0) return null;
  return (
    <Section title={t.staffProfile.pastGroups}>
      {m.past.map((g) => (
        <ListItem
          key={g.enrollmentId}
          title={g.name}
          subtitle={g.text}
          chevron
          onClick={() => onOpen(g.enrollmentId)}
        />
      ))}
    </Section>
  );
}

/** Q-124: arxivdagi o'quvchini butunlay o'chirish — qaytarib bo'lmaydi, shuning uchun ogohlantirish. */
function DeleteAction({ busy, onDelete }: { busy: boolean; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <ListItem
        before={<Trash2 className="size-5 text-danger" aria-hidden />}
        title={<span className="text-danger">{c.delete}</span>}
        onClick={busy ? undefined : () => setConfirm(true)}
      />
      <ActionSheet
        open={confirm}
        title={c.deleteTitle}
        cancelLabel={c.cancel}
        onClose={() => setConfirm(false)}
        actions={[
          {
            label: c.deleteConfirm,
            tone: 'danger',
            onSelect: () => {
              setConfirm(false);
              onDelete();
            },
          },
        ]}
      >
        <p className="px-4 pb-2 text-sm text-text-muted">{c.deleteText}</p>
      </ActionSheet>
    </>
  );
}

/** FR-STU-6: arxivlash (tasdiq — ActionSheet) yoki arxivdan chiqarish / butunlay o'chirish (Q-124). */
export function ArchiveSection({ m, busy, onArchive, onRestore, onDelete }: StudentManageProps) {
  const [confirm, setConfirm] = useState(false);
  if (m.archived)
    return (
      <Section>
        <ListItem
          before={<ArchiveRestore className="size-5" aria-hidden />}
          title={c.restore}
          onClick={busy ? undefined : onRestore}
        />
        {onDelete && <DeleteAction busy={busy} onDelete={onDelete} />}
      </Section>
    );
  return (
    <>
      <Section footer={m.canArchive ? undefined : c.archiveBlocked}>
        <ListItem
          before={<Archive className="size-5 text-danger" aria-hidden />}
          title={
            <span className={m.canArchive ? 'text-danger' : 'text-text-muted'}>{c.archive}</span>
          }
          onClick={m.canArchive && !busy ? () => setConfirm(true) : undefined}
        />
      </Section>
      <ActionSheet
        open={confirm}
        title={c.archiveTitle}
        cancelLabel={c.cancel}
        onClose={() => setConfirm(false)}
        actions={[
          {
            label: c.archive,
            tone: 'danger',
            onSelect: () => {
              setConfirm(false);
              onArchive();
            },
          },
        ]}
      >
        <p className="px-4 pb-2 text-sm text-text-muted">{c.archiveText}</p>
      </ActionSheet>
    </>
  );
}
