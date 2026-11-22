import { miniappMessages as t } from '@lg/i18n';
import { ActionSheet, ListItem, Section } from '@lg/ui-tg';
import { Archive, ArchiveRestore, LogOut } from 'lucide-react';
import { useState } from 'react';
import type { StudentManage } from '../../data/staff-student.js';

const c = t.studentCard;

export interface StudentManageProps {
  m: StudentManage;
  busy: boolean;
  onLeave: (enrollmentId: string) => void;
  onArchive: () => void;
  onRestore: () => void;
}

/** MS-05 guruhlar (`student.manage` bo'lsa): guruhni bosish — MS-05a «Guruhdan chiqarish». */
export function ManageGroups({ m, onLeave }: Pick<StudentManageProps, 'm' | 'onLeave'>) {
  if (m.groups.length === 0) return null;
  return (
    <Section title={c.groups} footer={c.leaveHint}>
      {m.groups.map((g) => (
        <ListItem
          key={g.enrollmentId}
          title={g.name}
          after={<LogOut className="size-5 text-text-muted" aria-hidden />}
          chevron
          onClick={() => onLeave(g.enrollmentId)}
        />
      ))}
    </Section>
  );
}

/** FR-STU-6: arxivlash (tasdiq — ActionSheet) yoki arxivdan chiqarish; o'chirish yo'q. */
export function ArchiveSection({ m, busy, onArchive, onRestore }: StudentManageProps) {
  const [confirm, setConfirm] = useState(false);
  if (m.archived)
    return (
      <Section>
        <ListItem
          before={<ArchiveRestore className="size-5" aria-hidden />}
          title={c.restore}
          onClick={busy ? undefined : onRestore}
        />
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
