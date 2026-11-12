import { miniappMessages as t } from '@lg/i18n';
import { ListItem, MoneyText, Section, useMainButton } from '@lg/ui-tg';

export interface ChildReport {
  kind: 'weekly' | 'monthly';
  childName: string;
  period: string;
  attended: number;
  total: number;
  averageGrade: string;
  debt: bigint;
  comments: readonly { teacher: string; text: string }[];
  /** Oylik — PDF (FR-RPT-3). */
  hasPdf: boolean;
}

/** MG-04 Hisobot (FR-RPT-2/3). */
export function ReportView({ r, onPdf }: { r: ChildReport; onPdf: () => void }) {
  useMainButton({ text: t.report.pdf, onClick: onPdf, visible: r.hasPdf });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">
          {r.kind === 'weekly' ? t.report.weekly : t.report.monthly}
        </h1>
        <p className="text-sm text-text-muted">
          {r.childName} · {r.period}
        </p>
      </header>
      <Section>
        <ListItem
          title={t.report.attendance}
          after={t.report.attendanceValue
            .replace('{x}', String(r.attended))
            .replace('{y}', String(r.total))}
        />
        <ListItem
          title={t.report.averageGrade}
          after={<span className="font-semibold text-text">{r.averageGrade}</span>}
        />
        <ListItem
          title={t.report.payment}
          after={
            r.debt > 0n ? (
              <MoneyText amount={-r.debt} />
            ) : (
              <span className="text-success">{t.childHome.settled}</span>
            )
          }
        />
      </Section>
      {r.comments.length > 0 && (
        <Section title={t.results.teacherComments}>
          {r.comments.map((c) => (
            <li
              key={c.teacher}
              className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-0"
            >
              <p className="text-base text-text">{c.text}</p>
              <span className="text-sm text-text-muted">{c.teacher}</span>
            </li>
          ))}
        </Section>
      )}
    </main>
  );
}
