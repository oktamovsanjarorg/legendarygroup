import type { GroupListItem } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { ListItem, Section, TextField, useMainButton } from '@lg/ui-tg';
import { Check } from 'lucide-react';
import { type NewStudentForm, newStudentValid } from '../../data/staff-new.js';

const c = t.staffNew;

export interface NewStudentViewProps {
  today: string;
  groups: readonly Pick<GroupListItem, 'id' | 'name' | 'course'>[];
  form: NewStudentForm;
  saving: boolean;
  onForm: (f: NewStudentForm) => void;
  onSave: () => void;
}

function GroupPicker(p: {
  groups: NewStudentViewProps['groups'];
  value: string;
  onPick: (id: string) => void;
}) {
  const { groups, value, onPick } = p;
  return (
    <Section title={c.group}>
      {groups.length === 0 ? (
        <li className="px-4 py-3 text-sm text-text-muted">{c.noGroups}</li>
      ) : (
        groups.map((g) => (
          <ListItem
            key={g.id}
            title={g.name}
            subtitle={g.course.name}
            after={
              value === g.id ? (
                <Check className="size-5 text-primary" aria-label={c.selected} />
              ) : undefined
            }
            onClick={() => onPick(g.id)}
          />
        ))
      )}
    </Section>
  );
}

/** MS-04a Yangi oʻquvchi (Q-97): hammasi bitta ekranda, MainButton — «Qoʻshish». */
export function NewStudentView({
  today,
  groups,
  form,
  saving,
  onForm,
  onSave,
}: NewStudentViewProps) {
  useMainButton({
    text: c.save,
    onClick: onSave,
    loading: saving,
    visible: newStudentValid(form, today),
  });
  const field = (key: keyof NewStudentForm) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => onForm({ ...form, [key]: e.target.value }),
  });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <h1 className="px-2 text-xl font-semibold text-text">{c.title}</h1>
      <Section>
        <li className="flex flex-col gap-3 px-4 py-3">
          <TextField label={c.fullName} autoComplete="off" {...field('fullName')} />
          <TextField label={c.phone} type="tel" inputMode="tel" {...field('phone')} />
          <TextField label={c.guardianName} autoComplete="off" {...field('guardianName')} />
          <TextField
            label={c.guardianPhone}
            type="tel"
            inputMode="tel"
            {...field('guardianPhone')}
          />
        </li>
      </Section>
      <GroupPicker
        groups={groups}
        value={form.groupId}
        onPick={(id) => onForm({ ...form, groupId: id })}
      />
      <Section footer={c.startHint}>
        <li className="px-4 py-3">
          <TextField label={c.startDate} type="date" max={today} {...field('startDate')} />
        </li>
      </Section>
    </main>
  );
}
