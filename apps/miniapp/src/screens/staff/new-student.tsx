import type { FirstMonthQuote, GroupListItem } from '@lg/contracts';
import { formatMoney, formatPeriod, miniappMessages as t } from '@lg/i18n';
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
  /** Lidni aylantirish (T-133): guruh ixtiyoriy, boshqa sarlavha. */
  title?: string;
  saveText?: string;
  groupTitle?: string;
  groupOptional?: boolean;
  /** BR-3: tanlangan guruh va sana bo'yicha birinchi oy (T-134). */
  quote?: FirstMonthQuote | null;
}

export const quoteText = (q: FirstMonthQuote) =>
  (q.amount === q.monthlyPrice ? c.firstMonthFull : c.firstMonth)
    .replace('{month}', formatPeriod(q.period))
    .replace('{sum}', formatMoney(BigInt(q.amount)))
    .replace('{left}', String(q.lessonsLeft))
    .replace('{total}', String(q.lessonsTotal));

function GroupPicker(p: {
  groups: NewStudentViewProps['groups'];
  title: string;
  value: string;
  onPick: (id: string) => void;
}) {
  const { groups, value, onPick } = p;
  return (
    <Section title={p.title}>
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
export function NewStudentView(p: NewStudentViewProps) {
  const { today, groups, form, saving, onForm, onSave } = p;
  const optional = p.groupOptional ?? false;
  useMainButton({
    text: p.saveText ?? c.save,
    onClick: onSave,
    loading: saving,
    visible: newStudentValid(form, today, optional),
  });
  const field = (key: keyof NewStudentForm) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => onForm({ ...form, [key]: e.target.value }),
  });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <h1 className="px-2 text-xl font-semibold text-text">{p.title ?? c.title}</h1>
      <Section>
        <li className="flex flex-col gap-3 px-4 py-3">
          <TextField label={c.fullName} autoComplete="off" {...field('fullName')} />
          <TextField label={c.birthDate} type="date" max={today} {...field('birthDate')} />
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
        title={p.groupTitle ?? c.group}
        groups={groups}
        value={form.groupId}
        onPick={(id) => onForm({ ...form, groupId: optional && id === form.groupId ? '' : id })}
      />
      <Section footer={p.quote ? `${quoteText(p.quote)} ${c.startHint}` : c.startHint}>
        <li className="px-4 py-3">
          <TextField label={c.startDate} type="date" max={today} {...field('startDate')} />
        </li>
      </Section>
    </main>
  );
}
