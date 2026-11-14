import { formatDateShort, miniappMessages as t } from '@lg/i18n';
import {
  AttendanceCalendar,
  ChildSwitcher,
  type ChartPoint,
  type ChildTab,
  ListItem,
  ProgressChart,
  Section,
} from '@lg/ui-tg';
import type { StudentProfile } from '../teacher/student.js';

export interface ResultTest {
  id: string;
  name: string;
  date: Date;
  percent: number;
}

export interface ChildResults {
  month: StudentProfile['month'];
  grades: StudentProfile['grades'];
  /** Faqat `parent` ko'rinishdagi izohlar (02 §3 — ichki izoh ota-onaga yo'q). */
  comments: readonly { id: string; date: Date; text: string; teacher: string }[];
  tests: readonly ResultTest[];
  progress: readonly ChartPoint[];
}

interface Props {
  childTabs: readonly ChildTab[];
  selected: string;
  onSelect: (id: string) => void;
  data: ChildResults;
  onTest: (test: ResultTest) => void;
}

/** Faqat ota-onaga ko'rinadigan ustoz izohlari. */
function CommentsSection({ comments }: { comments: ChildResults['comments'] }) {
  if (comments.length === 0) return null;
  return (
    <Section title={t.results.teacherComments}>
      {comments.map((c) => (
        <li
          key={c.id}
          className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-0"
        >
          <p className="text-base text-text">{c.text}</p>
          <span className="text-sm text-text-muted">
            {c.teacher} · {formatDateShort(c.date)}
          </span>
        </li>
      ))}
    </Section>
  );
}

/** MG-02 Natijalar (FR-GRD-5): davomat, baho, izoh, testlar, progress. */
export function ResultsView({ childTabs, selected, onSelect, data, onTest }: Props) {
  const avg = data.progress.at(-1)?.value;
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <ChildSwitcher
        items={childTabs}
        selected={selected}
        onSelect={onSelect}
        label={t.results.title}
      />
      <h1 className="px-2 text-2xl font-bold text-text">{t.results.title}</h1>
      <section className="flex flex-col gap-1.5">
        <h2 className="px-4 text-sm uppercase tracking-wide text-text-muted">
          {t.student.attendance} · {data.month.title}
        </h2>
        <AttendanceCalendar {...data.month} />
      </section>
      <section className="flex flex-col gap-1.5">
        <h2 className="px-4 text-sm uppercase tracking-wide text-text-muted">
          {t.results.progress}
        </h2>
        <ProgressChart
          points={data.progress}
          max={5}
          emptyLabel={t.results.progressEmpty}
          summary={`${t.results.progress}: ${avg ?? '—'}`}
        />
      </section>
      <Section title={t.results.tests}>
        {data.tests.map((x) => (
          <ListItem
            key={x.id}
            title={x.name}
            subtitle={formatDateShort(x.date)}
            after={
              <span className="text-base font-semibold tabular-nums text-text">{x.percent}%</span>
            }
            chevron
            onClick={() => onTest(x)}
          />
        ))}
      </Section>
      <Section title={t.student.grades}>
        {data.grades.map((g) => (
          <ListItem
            key={g.id}
            title={t.student.gradeKinds[g.kind]}
            subtitle={formatDateShort(g.date)}
            after={<span className="text-lg font-semibold tabular-nums text-text">{g.value}</span>}
          />
        ))}
      </Section>
      <CommentsSection comments={data.comments} />
    </main>
  );
}
