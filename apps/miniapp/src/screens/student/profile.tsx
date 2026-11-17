import type { StudentListRow } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { ListItem, Section } from '@lg/ui-tg';
import { BookOpen, GraduationCap, Settings, User } from 'lucide-react';

interface Props {
  student: StudentListRow;
  onSettings: () => void;
}

/**
 * M-STU-04 Oʻquvchi profili va guruhlari (T-126).
 */
export function StudentProfileView({ student, onSettings }: Props) {
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <h1 className="px-2 text-2xl font-bold text-text">{t.studentPanel.profileTitle}</h1>

      <div className="flex items-center gap-4 rounded-xl bg-surface-alt p-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-accent-bg text-accent">
          <User className="size-7" aria-hidden />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-text">{student.fullName}</span>
          {student.phone && <span className="text-sm text-text-muted">{student.phone}</span>}
          <span className="text-xs text-text-muted">ID: #{student.code}</span>
        </div>
      </div>

      <Section title={t.studentPanel.groupsTitle}>
        {student.groups.length === 0 ? (
          <ListItem title={t.studentPanel.noGroups} />
        ) : (
          student.groups.map((g) => (
            <ListItem
              key={g.id}
              before={<BookOpen className="size-5 text-accent" aria-hidden />}
              title={g.name}
            />
          ))
        )}
      </Section>

      <Section title={t.studentPanel.centerName}>
        <ListItem
          before={<GraduationCap className="size-5 text-text-muted" aria-hidden />}
          title={t.studentPanel.centerName}
        />
        <ListItem
          before={<Settings className="size-5 text-text-muted" aria-hidden />}
          title={t.settings.title}
          subtitle={t.studentPanel.settingsHint}
          chevron
          onClick={onSettings}
        />
      </Section>
    </main>
  );
}
