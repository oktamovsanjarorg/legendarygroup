import { miniappMessages as t } from '@lg/i18n';
import { InlineButton, ListItem, Section, StatusChip, useMainButton } from '@lg/ui-tg';
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

/** BR-35 moslashtirish natijasi: ID/aniq ism — mos; noaniq — taklif (inson tasdiqlaydi); xato — import qilinmaydi. */
export type ImportRow =
  | { row: number; kind: 'matched'; name: string; score: number }
  | {
      row: number;
      kind: 'fuzzy';
      raw: string;
      suggestion: string;
      score: number;
      decision?: 'accept' | 'reject';
    }
  | { row: number; kind: 'not_found'; raw: string }
  | { row: number; kind: 'bad_score'; raw: string; value: string };

export interface ColumnMap {
  column: string;
  field: string;
}

interface Props {
  testName: string;
  maxScore: number;
  columns: readonly ColumnMap[];
  rows: readonly ImportRow[];
  importing?: boolean;
  onDecide: (row: number, decision: 'accept' | 'reject') => void;
  onChangeColumns: () => void;
  onImport: () => void;
}

const icon = 'size-5';
type Kind = ImportRow['kind'];
const of =
  <K extends Kind>(...kinds: K[]) =>
  (r: ImportRow): r is Extract<ImportRow, { kind: K }> =>
    (kinds as Kind[]).includes(r.kind);

/** MT-08 Excel import ko'rib chiqish (FR-GRD-4, BR-35): atomar import. */
export function TestImportView(p: Props) {
  const matched = p.rows.filter(of('matched'));
  const fuzzy = p.rows.filter(of('fuzzy'));
  const errors = p.rows.filter(of('not_found', 'bad_score'));
  const pending = fuzzy.some((r) => !r.decision);
  const count = matched.length + fuzzy.filter((r) => r.decision === 'accept').length;
  useMainButton({
    text: pending ? t.testImport.resolveFirst : t.testImport.submit.replace('{n}', String(count)),
    onClick: p.onImport,
    disabled: pending || count === 0,
    loading: p.importing,
  });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{t.testImport.title}</h1>
        <p className="text-sm text-text-muted">
          {p.testName} · {t.tests.maxScore.replace('{n}', String(p.maxScore))}
        </p>
      </header>
      <Section title={t.testImport.mapping}>
        {p.columns.map((c) => (
          <ListItem
            key={c.column}
            title={c.field}
            after={t.testImport.column.replace('{c}', c.column)}
          />
        ))}
        <ListItem
          title={<span className="text-link">{t.testImport.change}</span>}
          onClick={p.onChangeColumns}
        />
      </Section>
      {fuzzy.length > 0 && (
        <Section
          title={`${t.testImport.review} · ${fuzzy.length}`}
          footer={t.testImport.reviewHint}
        >
          {fuzzy.map((r) => (
            <FuzzyRow key={r.row} r={r} onDecide={p.onDecide} />
          ))}
        </Section>
      )}
      <ErrorsSection rows={errors} maxScore={p.maxScore} />
      <MatchedSection rows={matched} />
    </main>
  );
}

type Errored = Extract<ImportRow, { kind: 'not_found' | 'bad_score' }>;

function ErrorsSection({ rows, maxScore }: { rows: readonly Errored[]; maxScore: number }) {
  if (rows.length === 0) return null;
  const why = (r: Errored) =>
    r.kind === 'bad_score'
      ? t.testImport.badScore.replace('{value}', r.value).replace('{max}', String(maxScore))
      : t.testImport.notFound;
  return (
    <Section title={`${t.testImport.errors} · ${rows.length}`}>
      {rows.map((r) => (
        <ListItem
          key={r.row}
          before={<AlertTriangle className={`${icon} text-danger`} aria-hidden />}
          title={r.raw}
          subtitle={`${t.testImport.row.replace('{n}', String(r.row))} · ${why(r)}`}
        />
      ))}
    </Section>
  );
}

function MatchedSection({ rows }: { rows: readonly Extract<ImportRow, { kind: 'matched' }>[] }) {
  return (
    <Section title={`${t.testImport.matched} · ${rows.length}`} footer={t.testImport.atomicNote}>
      {rows.map((r) => (
        <ListItem
          key={r.row}
          before={<CheckCircle2 className={`${icon} text-success`} aria-hidden />}
          title={r.name}
          after={<span className="text-base font-semibold tabular-nums text-text">{r.score}</span>}
        />
      ))}
    </Section>
  );
}

type Fuzzy = Extract<ImportRow, { kind: 'fuzzy' }>;

function FuzzyRow({ r, onDecide }: { r: Fuzzy; onDecide: Props['onDecide'] }) {
  return (
    <li className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-0">
      <span className="flex items-start gap-3">
        <HelpCircle className={`${icon} shrink-0 text-warning`} aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base text-text">
            «{r.raw}» · {r.score}
          </span>
          <span className="text-sm text-text-muted">
            {t.testImport.suggestion.replace('{name}', r.suggestion)}
          </span>
        </span>
        {r.decision && (
          <StatusChip tone={r.decision === 'accept' ? 'success' : 'muted'}>
            {r.decision === 'accept' ? t.testImport.accept : t.testImport.reject}
          </StatusChip>
        )}
      </span>
      {!r.decision && (
        <span className="flex justify-end gap-2">
          <InlineButton onClick={() => onDecide(r.row, 'reject')}>
            {t.testImport.reject}
          </InlineButton>
          <InlineButton onClick={() => onDecide(r.row, 'accept')}>
            {t.testImport.accept}
          </InlineButton>
        </span>
      )}
    </li>
  );
}
