import type { TeacherCodeRow } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { EmptyState, ListItem, Section, useClosingConfirmation, useMainButton } from '@lg/ui-tg';
import { useState } from 'react';
import { changedCodes, codeIssues, initialCodes, titulCode } from './codes-form.js';

interface Props {
  groupName: string;
  rows: readonly TeacherCodeRow[];
  saving?: boolean;
  /** Server xatosi (masalan, band kod — 409). */
  error?: string;
  saved?: boolean;
  onSave: (items: { studentId: string; code: number | null }[]) => void;
}

const c = t.codes;

function subtitle(row: TeacherCodeRow, value: string, issue: string | undefined): string {
  if (issue) return issue === 'duplicate' ? c.duplicate : c.invalid;
  const titul = titulCode(value);
  const suggested = row.code === null && row.suggested !== null && value === String(row.suggested);
  const text = titul ? c.titul.replace('{code}', titul) : '';
  return suggested ? `${text} · ${c.suggested}` : text;
}

interface RowProps {
  row: TeacherCodeRow;
  value: string;
  issue?: string;
  onChange: (value: string) => void;
}

function CodeRow({ row, value, issue, onChange }: RowProps) {
  return (
    <ListItem
      title={row.fullName}
      subtitle={subtitle(row, value, issue) || undefined}
      after={
        <input
          aria-label={row.fullName}
          aria-invalid={issue ? true : undefined}
          inputMode="numeric"
          maxLength={3}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 3))}
          className={`min-h-10 w-16 rounded-lg bg-bg text-center text-base text-text outline-none ${issue ? 'ring-2 ring-danger' : ''}`}
        />
      }
    />
  );
}

/** MT-05a Oʻquvchi kodlari (T-128, Q-92): ustoz kiritadi, tizim boʻsh kodni taklif qiladi. */
export function CodesView({ groupName, rows, saving, error, saved, onSave }: Props) {
  const [values, setValues] = useState(() => initialCodes(rows));
  const issues = codeIssues(values);
  const changes = changedCodes(rows, values);
  useClosingConfirmation(changes !== null && changes.length > 0);
  useMainButton({
    text: c.save,
    onClick: () => changes && changes.length > 0 && onSave(changes),
    disabled: changes === null || changes.length === 0,
    loading: saving,
  });
  if (rows.length === 0) return <EmptyState title={c.empty} hint={c.emptyHint} />;
  return (
    <main className="flex flex-col gap-4 p-2 pt-3">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{c.title}</h1>
        <p className="text-sm text-text-muted">{groupName}</p>
        <p className="mt-2 text-sm text-text-muted">{c.hint}</p>
      </header>
      {error && (
        <p role="alert" className="mx-2 rounded-xl bg-danger-bg p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="mx-2 rounded-xl bg-success-bg p-3 text-sm text-success">
          {c.saved}
        </p>
      )}
      <Section>
        {rows.map((r) => (
          <CodeRow
            key={r.studentId}
            row={r}
            value={values[r.studentId] ?? ''}
            issue={issues[r.studentId]}
            onChange={(v) => setValues((prev) => ({ ...prev, [r.studentId]: v }))}
          />
        ))}
      </Section>
    </main>
  );
}
