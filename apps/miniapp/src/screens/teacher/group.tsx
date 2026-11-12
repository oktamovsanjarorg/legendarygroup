import { miniappMessages as t } from '@lg/i18n';
import { EmptyState, ListItem, Section, StatusChip } from '@lg/ui-tg';
import { FileSpreadsheet, Megaphone } from 'lucide-react';
import type { TeacherGroup } from './groups.js';

export interface GroupStudent {
  id: string;
  name: string;
  /** Davomat foizi (butun son). */
  attendanceRate: number;
  lastGrade?: string;
}

interface Props {
  group: TeacherGroup;
  students: readonly GroupStudent[];
  onStudent: (s: GroupStudent) => void;
  onTests: () => void;
  /** Faqat asosiy ustozda (MT-10). */
  onAnnounce?: () => void;
}

const rateTone = (n: number) => (n >= 85 ? 'success' : n >= 70 ? 'warning' : 'danger');

/** MT-05 Guruh: o'quvchilar (davomat %, oxirgi baho), testlar, e'lon (main). */
export function GroupView({ group, students, onStudent, onTests, onAnnounce }: Props) {
  return (
    <main className="flex flex-col gap-4 p-2 pt-3">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{group.name}</h1>
        <p className="text-sm text-text-muted">{group.courseName}</p>
      </header>
      <Section>
        <ListItem
          before={<FileSpreadsheet className="size-5" aria-hidden />}
          title={t.groups.tests}
          chevron
          onClick={onTests}
        />
        {group.role === 'main' && onAnnounce && (
          <ListItem
            before={<Megaphone className="size-5" aria-hidden />}
            title={t.groups.announce}
            chevron
            onClick={onAnnounce}
          />
        )}
      </Section>
      {students.length === 0 ? (
        <EmptyState title={t.attendance.empty} hint={t.attendance.emptyHint} />
      ) : (
        <Section title={`${t.groups.studentsSection} · ${students.length}`}>
          {students.map((s) => (
            <ListItem
              key={s.id}
              title={s.name}
              subtitle={s.lastGrade ? t.groups.lastGrade.replace('{g}', s.lastGrade) : undefined}
              after={
                <StatusChip tone={rateTone(s.attendanceRate)}>
                  {t.groups.attendanceRate.replace('{n}', String(s.attendanceRate))}
                </StatusChip>
              }
              chevron
              onClick={() => onStudent(s)}
            />
          ))}
        </Section>
      )}
    </main>
  );
}
