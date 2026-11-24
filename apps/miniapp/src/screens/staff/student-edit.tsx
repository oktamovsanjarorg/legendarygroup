import { ACQUISITION_SOURCES, GENDERS, type StudentDetail } from '@lg/contracts';
import { formatPhone, formatYmd, miniappMessages as t } from '@lg/i18n';
import { ListItem, Section, TextArea, TextField, useMainButton } from '@lg/ui-tg';
import { CalendarCheck, KeyRound, Pencil, ReceiptText } from 'lucide-react';
import { type StudentForm, studentFormReady } from '../../data/staff-profile.js';
import { Fields, InfoSection, Screen } from './form-kit.js';
import { ChoiceSection } from './kit.js';

const c = t.staffProfile;
const NONE = '';

/** Kartochkadagi shaxsiy ma'lumotlar (faqat kiritilganlari). */
export const StudentInfo = ({ s }: { s: StudentDetail }) => (
  <InfoSection
    title={c.info}
    items={[
      { label: c.phone, value: s.phone && formatPhone(s.phone) },
      { label: c.birthDate, value: s.birthDate && formatYmd(s.birthDate) },
      { label: c.gender, value: s.gender && c.genders[s.gender] },
      { label: c.school, value: s.school },
      { label: c.grade, value: s.grade },
      { label: c.source, value: s.source && t.leads.sources[s.source] },
      { label: c.notes, value: s.notes },
    ]}
  />
);

export interface StudentLinksProps {
  onFinance?: () => void;
  onAttendance?: () => void;
  onAccess?: () => void;
  onEdit?: () => void;
}

/** Kartochkadan ichki ekranlarga o'tish — ruxsatga qarab. */
export function StudentLinks(p: StudentLinksProps) {
  const items = [
    { icon: ReceiptText, title: c.finance, run: p.onFinance },
    { icon: CalendarCheck, title: c.attendance, run: p.onAttendance },
    { icon: KeyRound, title: c.access, run: p.onAccess },
    { icon: Pencil, title: c.edit, run: p.onEdit },
  ].filter((i) => i.run);
  if (items.length === 0) return null;
  return (
    <Section>
      {items.map(({ icon: Icon, title, run }) => (
        <ListItem
          key={title}
          before={<Icon className="size-5" aria-hidden />}
          title={title}
          chevron
          onClick={run}
        />
      ))}
    </Section>
  );
}

function EditChoices(p: { form: StudentForm; onForm: (f: StudentForm) => void }) {
  const { form, onForm } = p;
  return (
    <>
      <ChoiceSection
        title={c.gender}
        value={form.gender ?? NONE}
        options={[
          { value: NONE, label: c.notSet },
          ...GENDERS.map((g) => ({ value: g, label: c.genders[g] })),
        ]}
        onChange={(v) => onForm({ ...form, gender: v === NONE ? null : v })}
      />
      <ChoiceSection
        title={c.source}
        value={form.source ?? NONE}
        options={[
          { value: NONE, label: c.notSet },
          ...ACQUISITION_SOURCES.map((s) => ({ value: s, label: t.leads.sources[s] })),
        ]}
        onChange={(v) => onForm({ ...form, source: v === NONE ? null : v })}
      />
    </>
  );
}

type TextKey = 'fullName' | 'phone' | 'school' | 'grade';

/** Shaxsiy ma'lumotlar tahriri (FR-STU-1). */
export function StudentEditView(p: {
  form: StudentForm;
  today: string;
  saving: boolean;
  onForm: (f: StudentForm) => void;
  onSave: () => void;
}) {
  const { form, today, onForm } = p;
  useMainButton({
    text: c.save,
    disabled: !studentFormReady(form, today),
    loading: p.saving,
    onClick: p.onSave,
  });
  const text = (key: TextKey) => ({
    label: c[key],
    value: form[key],
    onChange: (e: { target: { value: string } }) => onForm({ ...form, [key]: e.target.value }),
  });
  return (
    <Screen title={c.edit}>
      <Fields>
        <TextField autoComplete="off" maxLength={120} {...text('fullName')} />
        <TextField type="tel" inputMode="tel" {...text('phone')} />
        <TextField
          label={c.birthDate}
          type="date"
          max={today}
          value={form.birthDate}
          onChange={(e) => onForm({ ...form, birthDate: e.target.value })}
        />
        <TextField maxLength={120} {...text('school')} />
        <TextField maxLength={20} {...text('grade')} />
      </Fields>
      <EditChoices form={form} onForm={onForm} />
      <Fields>
        <TextArea
          label={c.notes}
          rows={3}
          maxLength={2000}
          value={form.notes}
          onChange={(e) => onForm({ ...form, notes: e.target.value })}
        />
      </Fields>
    </Screen>
  );
}
