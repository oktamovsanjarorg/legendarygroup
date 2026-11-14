import { ACQUISITION_SOURCES, GENDERS, GUARDIAN_RELATIONS } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Field, SelectField } from '@lg/ui-web';
import { useEffect, useRef } from 'react';
import type { GuardianDraft, StudentDraft, StudentErrors } from './student-draft.js';
import { useGuardianLookup } from './use-students.js';

const f = t.students.form;
const NOT_SET = { value: '', label: f.notSet };
const GENDER_OPTIONS = [
  NOT_SET,
  ...GENDERS.map((g) => ({ value: g, label: t.students.genders[g] })),
];
const SOURCE_OPTIONS = [
  NOT_SET,
  ...ACQUISITION_SOURCES.map((s) => ({ value: s, label: t.students.sources[s] })),
];
export const RELATION_OPTIONS = GUARDIAN_RELATIONS.map((r) => ({
  value: r,
  label: t.students.relations[r],
}));

type Change = (e: { target: { value: string } }) => void;

interface StudentProps {
  d: StudentDraft;
  errors: StudentErrors;
  set: (patch: Partial<StudentDraft>) => void;
}

/** O'quvchi maydonlari (FR-STU-1) — yaratish va tahrirlash formalari uchun bitta. */
export function StudentFields({ d, errors, set }: StudentProps) {
  const on =
    (k: keyof StudentDraft): Change =>
    (e) =>
      set({ [k]: e.target.value });
  return (
    <>
      <Field
        label={f.fullName}
        autoFocus
        autoComplete="off"
        value={d.fullName}
        onChange={on('fullName')}
        error={errors.fullName}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={f.birthDate}
          type="date"
          value={d.birthDate}
          onChange={on('birthDate')}
          error={errors.birthDate}
        />
        <SelectField
          label={f.gender}
          options={GENDER_OPTIONS}
          value={d.gender}
          onChange={on('gender')}
        />
      </div>
      <Field
        label={f.phone}
        type="tel"
        autoComplete="off"
        value={d.phone}
        onChange={on('phone')}
        error={errors.phone}
      />
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <Field label={f.school} autoComplete="off" value={d.school} onChange={on('school')} />
        <Field label={f.grade} autoComplete="off" value={d.grade} onChange={on('grade')} />
      </div>
      <SelectField
        label={f.source}
        options={SOURCE_OPTIONS}
        value={d.source}
        onChange={on('source')}
      />
      <Field label={f.notes} autoComplete="off" value={d.notes} onChange={on('notes')} />
    </>
  );
}

/** FR-STU-2: raqam bazada bo'lsa — kimligi va farzandlari ko'rsatiladi (qayta kiritmaslik uchun). */
function KnownGuardian({ phone, onKnown }: { phone: string; onKnown: (name: string) => void }) {
  const known = useGuardianLookup(phone).data?.guardian;
  const name = known?.fullName;
  const report = useRef(onKnown);
  report.current = onKnown;
  // Topilgan ota-ona ismi maydonga o'zi yoziladi (qayta termaslik uchun).
  useEffect(() => {
    if (name) report.current(name);
  }, [name]);
  if (!known) return null;
  const children = known.children.map((c) => c.fullName).join(', ');
  const text = children
    ? f.known.replace('{name}', known.fullName).replace('{children}', children)
    : f.knownAlone.replace('{name}', known.fullName);
  return (
    <p role="status" className="rounded-md bg-surface p-2 text-sm text-text">
      {text}
    </p>
  );
}

interface GuardianProps {
  g: GuardianDraft;
  errors: StudentErrors;
  set: (patch: Partial<GuardianDraft>) => void;
}

/** Ota-ona maydonlari: telefon — bog'lash kaliti (mavjud bo'lsa, o'sha yozuv ulanadi). */
export function GuardianFields({ g, errors, set }: GuardianProps) {
  return (
    <>
      <Field
        label={f.guardianPhone}
        type="tel"
        autoComplete="off"
        value={g.phone}
        onChange={(e) => set({ phone: e.target.value })}
        error={errors.guardianPhone}
      />
      <KnownGuardian
        phone={g.phone}
        onKnown={(fullName) => g.fullName.trim() === '' && set({ fullName })}
      />
      <Field
        label={f.guardianName}
        autoComplete="off"
        value={g.fullName}
        onChange={(e) => set({ fullName: e.target.value })}
        error={errors.guardianName}
      />
      <SelectField
        label={f.relation}
        options={RELATION_OPTIONS}
        value={g.relation}
        onChange={(e) => {
          const relation = GUARDIAN_RELATIONS.find((r) => r === e.target.value);
          if (relation) set({ relation });
        }}
      />
    </>
  );
}
