import { miniappMessages as t } from '@lg/i18n';
import { EmptyState, ListItem, Section, StatusChip } from '@lg/ui-tg';
import { Users } from 'lucide-react';

export interface TeacherGroup {
  id: string;
  name: string;
  courseName: string;
  studentCount: number;
  /** Q-64: asosiy yoki yordamchi ustoz. */
  role: 'main' | 'assistant';
}

interface Props {
  groups: readonly TeacherGroup[];
  onOpen: (g: TeacherGroup) => void;
}

/** MT-04 Guruhlarim (Q-64): faqat joriy guruhlar. */
export function GroupsView({ groups, onOpen }: Props) {
  if (groups.length === 0) return <EmptyState title={t.groups.empty} hint={t.groups.emptyHint} />;
  return (
    <main className="flex flex-col gap-3 p-2 pt-3">
      <h1 className="px-2 text-2xl font-bold text-text">{t.groups.title}</h1>
      <Section>
        {groups.map((g) => (
          <ListItem
            key={g.id}
            before={<Users className="size-5" aria-hidden />}
            title={g.name}
            subtitle={`${g.courseName} · ${t.groups.students.replace('{n}', String(g.studentCount))}`}
            after={
              g.role === 'assistant' ? (
                <StatusChip tone="muted">{t.groups.assistant}</StatusChip>
              ) : undefined
            }
            chevron
            onClick={() => onOpen(g)}
          />
        ))}
      </Section>
    </main>
  );
}
