import { webMessages as t } from '@lg/i18n';
import { Field } from '@lg/ui-web';

const m = t.calendar.lesson;

export interface When {
  date: string;
  startTime: string;
  endTime: string;
}

interface Props {
  value: When;
  error?: string | null;
  onChange: (w: When) => void;
}

/** Sana + boshlanish/tugash vaqti (ko'chirish, qoplovchi va qo'shimcha dars formalari). */
export function WhenFields({ value, error, onChange }: Props) {
  const set = (k: keyof When) => (e: { target: { value: string } }) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-3 gap-3">
        <Field label={m.date} type="date" value={value.date} onChange={set('date')} />
        <Field label={m.start} type="time" value={value.startTime} onChange={set('startTime')} />
        <Field label={m.end} type="time" value={value.endTime} onChange={set('endTime')} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
