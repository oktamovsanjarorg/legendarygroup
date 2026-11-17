import type { StudentProgressResponse, TestResultItem } from '@lg/contracts';
import { formatDateShort, formatYmd, miniappMessages as t } from '@lg/i18n';
import { type ChartPoint, ListItem, ProgressChart, Section } from '@lg/ui-tg';
import { Award, FileQuestion, TrendingUp } from 'lucide-react';

interface Props {
  tests: readonly TestResultItem[];
  progress: StudentProgressResponse | null;
}

type ProgressTest = NonNullable<StudentProgressResponse['testResults']>[number];

function RankCard({ rank, total }: { rank: number | null; total: number | null }) {
  if (rank === null || total === null) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-alt p-4">
      <Award className="size-7 text-warning" aria-hidden />
      <div className="flex flex-col">
        <span className="font-semibold text-text">
          {t.studentPanel.rankInGroup.replace('{rank}', String(rank))}
        </span>
        <span className="text-sm text-text-muted">
          {t.studentPanel.rankOf.replace('{total}', String(total))}
        </span>
      </div>
    </div>
  );
}

function ProgressTestsList({ items }: { items: readonly ProgressTest[] }) {
  return (
    <>
      {items.map((test) => (
        <ListItem
          key={test.testId}
          title={test.title}
          subtitle={`${formatYmd(test.date)} · ${t.studentPanel.scoreOf.replace('{score}', String(test.score)).replace('{max}', String(test.maxScore))}`}
          after={
            <span className="text-right font-semibold text-text tabular-nums">{test.percent}%</span>
          }
        />
      ))}
    </>
  );
}

function FallbackTestsList({ items }: { items: readonly TestResultItem[] }) {
  return (
    <>
      {items.map((test) => (
        <ListItem
          key={test.id}
          title={t.studentPanel.testFallback}
          subtitle={formatDateShort(new Date(test.createdAt))}
          after={
            <span className="text-right font-semibold text-text tabular-nums">
              {test.percentage}%
            </span>
          }
        />
      ))}
    </>
  );
}

function TestsSection({
  progressTests,
  tests,
}: {
  progressTests: readonly ProgressTest[];
  tests: readonly TestResultItem[];
}) {
  if (progressTests.length === 0 && tests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-text-muted">
        <FileQuestion className="size-8" aria-hidden />
        <p className="text-base font-medium">{t.studentPanel.noResults}</p>
        <p className="text-sm">{t.studentPanel.noResultsHint}</p>
      </div>
    );
  }
  return (
    <Section title={t.results.tests}>
      {progressTests.length > 0 ? (
        <ProgressTestsList items={progressTests} />
      ) : (
        <FallbackTestsList items={tests} />
      )}
    </Section>
  );
}

/**
 * M-STU-03 Oʻquvchi natijalari: testlar, ballar, reyting va grafik (T-126, D4).
 */
export function StudentResultsView({ tests, progress }: Props) {
  const chartPoints: ChartPoint[] = (progress?.gradesTrend ?? []).map((g) => ({
    label: formatYmd(g.date).slice(0, 5),
    value: g.value,
  }));

  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <h1 className="px-2 text-2xl font-bold text-text">{t.studentPanel.resultsTitle}</h1>
      <RankCard rank={progress?.rank ?? null} total={progress?.totalStudents ?? null} />
      {chartPoints.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl bg-surface-alt p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-accent" aria-hidden />
            <span className="font-semibold text-text">{t.studentPanel.averageScore}</span>
          </div>
          <ProgressChart
            points={chartPoints}
            max={100}
            emptyLabel={t.results.progressEmpty}
            summary={t.studentPanel.averageScore}
          />
        </section>
      )}
      <TestsSection progressTests={progress?.testResults ?? []} tests={tests} />
    </main>
  );
}
