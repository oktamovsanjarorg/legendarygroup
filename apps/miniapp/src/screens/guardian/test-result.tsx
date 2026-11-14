import { formatDateShort, miniappMessages as t } from '@lg/i18n';
import { ListItem, Section } from '@lg/ui-tg';

export interface TestResult {
  name: string;
  date: Date;
  score: number;
  max: number;
  sections: readonly { name: string; score: number; max: number }[];
  /** Q-42: o'rin ko'rsatilmaydi — faqat guruh o'rtachasi. */
  groupAveragePercent: number;
}

/** BR-34: foiz = ball / max × 100 (butun songa yaxlitlanadi — faqat ko'rsatish). */
export const percentOf = (score: number, max: number): number =>
  max > 0 ? Math.round((score / max) * 100) : 0;

/** MG-03 Test natijasi. */
export function TestResultView({ r }: { r: TestResult }) {
  const p = percentOf(r.score, r.max);
  const above = p >= r.groupAveragePercent;
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{r.name}</h1>
        <p className="text-sm text-text-muted">{formatDateShort(r.date)}</p>
      </header>
      <div className="flex flex-col items-center gap-1 rounded-xl bg-bg p-6">
        <span className="text-5xl font-bold tabular-nums text-text">{p}%</span>
        <span className="text-base text-text-muted">
          {t.testResult.score.replace('{score}', String(r.score)).replace('{max}', String(r.max))}
        </span>
        <span className={`text-sm ${above ? 'text-success' : 'text-warning'}`}>
          {t.testResult.groupAverage.replace('{n}', String(r.groupAveragePercent))}
        </span>
      </div>
      {r.sections.length > 0 && (
        <Section title={t.testResult.sections}>
          {r.sections.map((s) => (
            <ListItem
              key={s.name}
              title={s.name}
              after={
                <span className="tabular-nums text-text">
                  {s.score} / {s.max}
                </span>
              }
            />
          ))}
        </Section>
      )}
    </main>
  );
}
