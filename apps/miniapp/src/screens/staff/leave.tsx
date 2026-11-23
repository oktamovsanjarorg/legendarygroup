import { miniappMessages as t } from '@lg/i18n';
import {
  ActionSheet,
  ListItem,
  Section,
  Segmented,
  TextArea,
  TextField,
  useMainButton,
} from '@lg/ui-tg';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
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
  /** Q-96: xato yozilganni butunlay olib tashlash. */
  onRemove: () => void;
}

function RemoveMistake({ busy, onRemove }: { busy: boolean; onRemove: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Section footer={l.removeHint}>
        <ListItem
          before={<Trash2 className="size-5 text-danger" aria-hidden />}
          title={<span className="text-danger">{l.remove}</span>}
          onClick={busy ? undefined : () => setConfirm(true)}
        />
      </Section>
      <ActionSheet
        open={confirm}
        title={l.removeTitle}
        cancelLabel={l.cancel}
        onClose={() => setConfirm(false)}
        actions={[
          {
            label: l.remove,
            tone: 'danger',
            onSelect: () => {
              setConfirm(false);
              onRemove();
            },
          },
        ]}
      >
        <p className="px-4 pb-2 text-sm text-text-muted">{l.removeText}</p>
      </ActionSheet>
    </>
  );
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
  onRemove,
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
      <RemoveMistake busy={saving} onRemove={onRemove} />
    </main>
  );
}
