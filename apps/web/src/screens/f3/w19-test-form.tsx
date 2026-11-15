import { webMessages as t } from '@lg/i18n';
import { Button, Drawer, Field } from '@lg/ui-web';
import { useState } from 'react';

const ff = t.tests.form;
export interface NewTest {
  title: string;
  date: string;
  maxScore: number;
}

export function TestFormDrawer(p: {
  today: string;
  onSubmit: (v: NewTest) => void;
  onClose: () => void;
  saving?: boolean;
  error?: string;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(p.today);
  const [max, setMax] = useState('100');
  const [invalid, setInvalid] = useState(false);
  const submit = () => {
    const maxScore = Number(max);
    if (title.trim().length < 1 || !Number.isInteger(maxScore) || maxScore <= 0)
      return setInvalid(true);
    setInvalid(false);
    p.onSubmit({ title: title.trim(), date, maxScore });
  };
  return (
    <Drawer open title={ff.title} closeLabel={t.common.cancel} onClose={p.onClose}>
      <div className="flex flex-col gap-4 text-sm">
        <Field label={ff.titleLabel} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Field
          label={ff.dateLabel}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Field
          label={ff.maxLabel}
          type="number"
          min={1}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          error={invalid ? ff.invalid : undefined}
        />
        {p.error && (
          <p role="alert" className="text-danger">
            {p.error}
          </p>
        )}
        <Button onClick={submit} loading={p.saving}>
          {ff.submit}
        </Button>
      </div>
    </Drawer>
  );
}
