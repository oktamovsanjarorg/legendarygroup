import { formatDateShort, miniappMessages as t } from '@lg/i18n';
import {
  AttendanceCalendar,
  type AttendanceMark,
  ListItem,
  Section,
  StatusChip,
  useMainButton,
} from '@lg/ui-tg';
import { EyeOff, Users } from 'lucide-react';

export interface StudentGrade {
  id: string;
  date: Date;
  kind: 'homework' | 'activity';
  value: string;
}

export interface StudentComment {
  id: string;
  date: Date;
  text: string;
  visibility: 'parent' | 'internal';
}

export interface StudentProfile {
  name: string;
  groupName: string;
  month: {
    title: string;
    offset: number;
    daysInMonth: number;
    marks: Record<number, AttendanceMark['kind']>;
  };
  grades: readonly StudentGrade[];
  comments: readonly StudentComment[];
  /** BR-37: baho/izoh tahrirlash muddati. */
  editableUntil: Date;
}

interface Props {
  profile: StudentProfile;
  /** Izoh — faqat asosiy ustoz (Q-62). */
  canComment: boolean;
  onAddComment: () => void;
}

/** MT-06 O'quvchi profili: davomat kalendari, baholar, izohlar. Ota-ona telefoni yo'q (Q-63). */
export function StudentView({ profile, canComment, onAddComment }: Props) {
  useMainButton({ text: t.student.addComment, onClick: onAddComment, visible: canComment });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{profile.name}</h1>
        <p className="text-sm text-text-muted">{profile.groupName}</p>
      </header>
      <section className="flex flex-col gap-1.5">
        <h2 className="px-4 text-sm uppercase tracking-wide text-text-muted">
          {t.student.attendance} · {profile.month.title}
        </h2>
        <AttendanceCalendar {...profile.month} />
      </section>
      <Section
        title={t.student.grades}
        footer={t.student.editDeadline.replace('{date}', formatDateShort(profile.editableUntil))}
      >
        {profile.grades.length === 0 ? (
          <ListItem title={<span className="text-text-muted">{t.student.noGrades}</span>} />
        ) : (
          profile.grades.map((g) => (
            <ListItem
              key={g.id}
              title={t.student.gradeKinds[g.kind]}
              subtitle={formatDateShort(g.date)}
              after={
                <span className="text-lg font-semibold tabular-nums text-text">{g.value}</span>
              }
            />
          ))
        )}
      </Section>
      <Section title={t.student.comments}>
        {profile.comments.length === 0 ? (
          <ListItem title={<span className="text-text-muted">{t.student.noComments}</span>} />
        ) : (
          profile.comments.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-1.5 border-b border-border px-4 py-3 last:border-0"
            >
              <p className="text-base text-text">{c.text}</p>
              <span className="flex items-center gap-2 text-sm text-text-muted">
                {formatDateShort(c.date)}
                <VisibilityChip visibility={c.visibility} />
              </span>
            </li>
          ))
        )}
      </Section>
    </main>
  );
}

export function VisibilityChip({ visibility }: { visibility: StudentComment['visibility'] }) {
  return visibility === 'parent' ? (
    <StatusChip tone="info" icon={<Users className="size-3.5" aria-hidden />}>
      {t.student.visibleToParent}
    </StatusChip>
  ) : (
    <StatusChip tone="muted" icon={<EyeOff className="size-3.5" aria-hidden />}>
      {t.student.internal}
    </StatusChip>
  );
}
