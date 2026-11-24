import type { PayrollStaffOption, TeacherAdvance } from '@lg/contracts';
import { formatMoney, formatYmd, miniappMessages as t } from '@lg/i18n';
import {
  ListItem,
  MoneyInput,
  MoneyText,
  Section,
  TextArea,
  TextField,
  useMainButton,
} from '@lg/ui-tg';
import { useState } from 'react';
import { advanceBody, type AdvanceForm, staffOptions } from '../../data/staff-payroll.js';
import { EmptyRow, Fields, Screen } from './form-kit.js';
import { ChoiceSection, ConfirmSheet } from './kit.js';

const a = t.staffAdvances;

/** MS-28c Avanslar (BR-28): ushlangani va qoldigʻi. */
export function AdvancesView(p: {
  items: readonly TeacherAdvance[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const [remove, setRemove] = useState<string | null>(null);
  useMainButton({ text: a.add, onClick: p.onAdd });
  return (
    <Screen title={a.title}>
      <Section footer={a.hint}>
        {p.items.length === 0 && <EmptyRow text={a.empty} />}
        {p.items.map((x) => {
          const left = BigInt(x.amount) - BigInt(x.withheld);
          const state = left === 0n ? a.settled : a.left.replace('{sum}', formatMoney(left));
          return (
            <ListItem
              key={x.id}
              title={x.teacherName}
              subtitle={[formatYmd(x.givenAt), state, x.note].filter(Boolean).join(' · ')}
              after={<MoneyText amount={BigInt(x.amount)} />}
              onClick={() => setRemove(x.id)}
            />
          );
        })}
      </Section>
      <ConfirmSheet
        open={remove !== null}
        title={a.removeTitle}
        action={a.remove}
        danger
        onClose={() => setRemove(null)}
        onConfirm={() => remove && p.onRemove(remove)}
      />
    </Screen>
  );
}

export function AdvanceNewView(p: {
  form: AdvanceForm;
  staff: readonly PayrollStaffOption[];
  today: string;
  saving: boolean;
  onForm: (f: AdvanceForm) => void;
  onSave: () => void;
}) {
  const { form, onForm } = p;
  useMainButton({
    text: a.save,
    disabled: advanceBody(form, p.today) === null,
    loading: p.saving,
    onClick: p.onSave,
  });
  return (
    <Screen title={a.add}>
      <Fields footer={a.hint}>
        <MoneyInput
          label={a.amount}
          value={form.amount}
          onChange={(amount) => onForm({ ...form, amount })}
        />
        <TextField
          label={a.date}
          type="date"
          max={p.today}
          value={form.date}
          onChange={(e) => onForm({ ...form, date: e.target.value })}
        />
        <TextArea
          label={a.note}
          rows={2}
          maxLength={255}
          value={form.note}
          onChange={(e) => onForm({ ...form, note: e.target.value })}
        />
      </Fields>
      <ChoiceSection
        title={t.staffContracts.who}
        value={form.teacherId}
        options={staffOptions(p.staff)}
        onChange={(teacherId) => onForm({ ...form, teacherId })}
      />
    </Screen>
  );
}
