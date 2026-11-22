import { miniappMessages as t } from '@lg/i18n';
import { Segmented, TextArea, TextField, useMainButton } from '@lg/ui-tg';
import type { LeaveInput } from '../../data/staff-student.js';

const l = t.staffLeave;

export interface LeaveViewProps {
  student: string;
  group: string;
  /** A'zolik boshlangan kun — undan oldingi sana qabul qilinmaydi (server ham tekshiradi). */
  minDate: string;
  value: LeaveInput;
  saving: boolean;
  onChange: (v: LeaveInput) => void;
  onSave: () => void;
}

/** MS-05a Guruhdan chiqarish (T-144): oxirgi kun, sabab, izoh → MainButton. */
export function LeaveView({
  student,
  group,
  minDate,
  value,
  saving,
  onChange,
  onSave,
}: LeaveViewProps) {
  const valid = value.endDate !== '' && value.endDate >= minDate;
  useMainButton({ text: l.save, onClick: onSave, loading: saving, visible: valid });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{l.title}</h1>
        <p className="text-sm text-text-muted">
          {student} · {group}
        </p>
      </header>
      <TextField
        label={l.date}
        type="date"
        min={minDate}
        value={value.endDate}
        hint={l.dateHint}
        onChange={(e) => onChange({ ...value, endDate: e.target.value })}
      />
      <Segmented
        label={l.reason}
        value={value.reason}
        options={(['left', 'finished'] as const).map((r) => ({ value: r, label: l.reasons[r] }))}
        onChange={(reason) => onChange({ ...value, reason })}
      />
      <TextArea
        label={l.note}
        maxLength={500}
        value={value.note ?? ''}
        onChange={(e) =>
          onChange({ ...value, note: e.target.value.trim() === '' ? null : e.target.value })
        }
      />
    </main>
  );
}
