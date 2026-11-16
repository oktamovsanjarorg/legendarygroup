import { miniappMessages as t } from '@lg/i18n';
import { TextField, useClosingConfirmation, useMainButton } from '@lg/ui-tg';
import { useState } from 'react';

export interface NewTest {
  title: string;
  /** `YYYY-MM-DD`, Toshkent kuni. */
  date: string;
  maxScore: number;
}

/** API: nom 1–120, maks. ball musbat butun (`CreateTestRequest`); yuqori chegara — amaliy. */
export const MAX_TEST_SCORE = 1000;

interface Props {
  groupName: string;
  defaultDate: string;
  creating?: boolean;
  error?: string;
  onSubmit: (test: NewTest) => void;
}

export function parseNewTest(title: string, date: string, maxScore: string): NewTest | null {
  const name = title.trim();
  const max = Number(maxScore);
  const okMax = /^\d+$/.test(maxScore) && max >= 1 && max <= MAX_TEST_SCORE;
  if (name.length === 0 || name.length > 120 || !okMax || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }
  return { title: name, date, maxScore: max };
}

/** MT-07a Test yaratish (FR-GRD-3, asosiy ustoz — Q-62): nom, sana, maks. ball. */
export function TestCreateView({ groupName, defaultDate, creating, error, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [maxScore, setMaxScore] = useState('');
  const parsed = parseNewTest(title, date, maxScore);
  const badMax = maxScore !== '' && parseNewTest('x', date, maxScore) === null;
  useClosingConfirmation(title.trim().length > 0);
  useMainButton({
    text: t.testCreate.submit,
    onClick: () => parsed && onSubmit(parsed),
    disabled: parsed === null,
    loading: creating,
  });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{t.testCreate.title}</h1>
        <p className="text-sm text-text-muted">{groupName}</p>
      </header>
      {error && (
        <p role="alert" className="mx-2 rounded-xl bg-danger-bg p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <TextField
        label={t.testCreate.name}
        placeholder={t.testCreate.namePlaceholder}
        value={title}
        maxLength={120}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        label={t.testCreate.date}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <TextField
        label={t.testCreate.maxScore}
        inputMode="numeric"
        value={maxScore}
        hint={t.testCreate.maxScoreHint.replace('{max}', String(MAX_TEST_SCORE))}
        error={badMax ? t.testCreate.maxScoreError.replace('{max}', String(MAX_TEST_SCORE)) : null}
        onChange={(e) => setMaxScore(e.target.value.replace(/\D/g, '').slice(0, 4))}
      />
    </main>
  );
}
