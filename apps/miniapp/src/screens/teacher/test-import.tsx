import { miniappMessages as t } from '@lg/i18n';
import { InlineButton, ListItem, Section, StatusChip, useMainButton } from '@lg/ui-tg';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, HelpCircle } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';

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
  fileName?: string;
  fileError?: string;
  onFileSelect?: (file: File) => void;
  onDownloadTemplate?: () => void;
  canPublish?: boolean;
  onPublish?: () => void;
  isPublished?: boolean;
}

const icon = 'size-5';
type Kind = ImportRow['kind'];
const of =
  <K extends Kind>(...kinds: K[]) =>
  (r: ImportRow): r is Extract<ImportRow, { kind: K }> =>
    (kinds as Kind[]).includes(r.kind);

/** MT-08 Excel import ko'rib chiqish (FR-GRD-4, BR-35): atomar import. */
export function TestImportView(p: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const matched = p.rows.filter(of('matched'));
  const fuzzy = p.rows.filter(of('fuzzy'));
  const errors = p.rows.filter(of('not_found', 'bad_score'));
  const pending = fuzzy.some((r) => !r.decision);
  const count = matched.length + fuzzy.filter((r) => r.decision === 'accept').length;

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && p.onFileSelect) p.onFileSelect(file);
    e.target.value = '';
  };

  useMainButton({
    text: pending ? t.testImport.resolveFirst : t.testImport.submit.replace('{n}', String(count)),
    onClick: p.onImport,
    disabled: pending || count === 0,
    loading: p.importing,
  });

  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={onFileChange}
      />
      <TestImportHeader testName={p.testName} maxScore={p.maxScore} isPublished={p.isPublished} />
      {p.fileError && (
        <p role="alert" className="mx-2 rounded-xl bg-danger-bg p-3 text-sm text-danger">
          {p.fileError}
        </p>
      )}
      <MappingSection
        columns={p.columns}
        fileName={p.fileName}
        onChangeColumns={p.onChangeColumns}
        onChooseFile={p.onFileSelect ? () => fileInputRef.current?.click() : undefined}
        onDownloadTemplate={p.onDownloadTemplate}
      />
      {p.canPublish && p.onPublish && (
        <Section>
          <ListItem
            title={<span className="font-semibold text-primary">{t.tests.published}</span>}
            onClick={p.onPublish}
          />
        </Section>
      )}
      <ReviewSection rows={fuzzy} onDecide={p.onDecide} />
      <ErrorsSection rows={errors} maxScore={p.maxScore} />
      <MatchedSection rows={matched} />
    </main>
  );
}

function TestImportHeader({
  testName,
  maxScore,
  isPublished,
}: {
  testName: string;
  maxScore: number;
  isPublished?: boolean;
}) {
  return (
    <header className="px-2">
      <h1 className="text-xl font-semibold text-text">{t.testImport.title}</h1>
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <span>
          {testName} · {t.tests.maxScore.replace('{n}', String(maxScore))}
        </span>
        {isPublished && <StatusChip tone="success">{t.tests.published}</StatusChip>}
      </div>
    </header>
  );
}

function ReviewSection({
  rows,
  onDecide,
}: {
  rows: readonly Extract<ImportRow, { kind: 'fuzzy' }>[];
  onDecide: Props['onDecide'];
}) {
  if (rows.length === 0) return null;
  return (
    <Section title={`${t.testImport.review} · ${rows.length}`} footer={t.testImport.reviewHint}>
      {rows.map((r) => (
        <FuzzyRow key={r.row} r={r} onDecide={onDecide} />
      ))}
    </Section>
  );
}

function MappingSection({
  columns,
  fileName,
  onChangeColumns,
  onChooseFile,
  onDownloadTemplate,
}: {
  columns: readonly ColumnMap[];
  fileName?: string;
  onChangeColumns: () => void;
  onChooseFile?: () => void;
  onDownloadTemplate?: () => void;
}) {
  return (
    <Section title={t.testImport.mapping}>
      {columns.map((c) => (
        <ListItem
          key={c.column}
          title={c.field}
          after={t.testImport.column.replace('{c}', c.column)}
        />
      ))}
      <ListItem
        title={<span className="text-link">{t.testImport.change}</span>}
        onClick={onChangeColumns}
      />
      {onChooseFile && (
        <ListItem
          before={<FileSpreadsheet className="size-5" aria-hidden />}
          title={fileName ?? <span className="text-link">{t.testImport.chooseFile}</span>}
          onClick={onChooseFile}
        />
      )}
      {onDownloadTemplate && (
        <ListItem
          before={<Download className="size-5" aria-hidden />}
          title={<span className="text-link">{t.testImport.template}</span>}
          onClick={onDownloadTemplate}
        />
      )}
    </Section>
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
