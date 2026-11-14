import { ConvertLeadRequest, type LeadDto } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Field, SelectField } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { ApiError } from '../../api/client.js';
import { FormError } from '../../components/panel-section.js';
import { todayYmd } from '../../lib/today.js';
import {
  EMPTY_GUARDIAN,
  type GuardianDraft,
  guardianFilled,
  type StudentErrors,
} from '../students/student-draft.js';
import { GuardianFields } from '../students/student-fields.js';
import { type LeadOptions, useLeadCall } from './use-leads.js';

const c = t.leads.convertForm;
const sf = t.students.form;

interface Draft {
  fullName: string;
  birthDate: string;
  guardian: GuardianDraft;
  groupId: string;
  startDate: string;
}

/** Forma → `POST /leads/:id/convert` (API bilan bitta Zod sxema). */
export function convertBody(d: Draft, allowDuplicate: boolean) {
  const parsed = ConvertLeadRequest.safeParse({
    student: {
      fullName: d.fullName,
      birthDate: d.birthDate || null,
      guardians: guardianFilled(d.guardian) ? [{ ...d.guardian, isPrimary: true }] : [],
      allowDuplicate,
    },
    enroll: d.groupId ? { groupId: d.groupId, startDate: d.startDate } : null,
  });
  if (parsed.success) return { ok: true as const, body: parsed.data };
  const errors: StudentErrors = {};
  for (const { path } of parsed.error.issues) {
    const inGuardian = path[1] === 'guardians';
    const leaf = path.at(-1);
    if (inGuardian && leaf === 'phone') errors.guardianPhone = sf.errors.guardianPhone;
    else if (inGuardian) errors.guardianName = sf.errors.guardianName;
    else if (leaf === 'fullName') errors.fullName = sf.errors.fullName;
  }
  return { ok: false as const, errors };
}

interface EnrollProps {
  d: Draft;
  groups: LeadOptions['groups'];
  set: (patch: Partial<Draft>) => void;
}

/** Ixtiyoriy: aylantirish bilan birga guruhga yozish. */
function EnrollFields({ d, groups, set }: EnrollProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <SelectField
        label={c.enroll}
        options={[{ value: '', label: c.enrollNone }, ...groups]}
        value={d.groupId}
        onChange={(e) => set({ groupId: e.target.value })}
      />
      <Field
        label={c.startDate}
        type="date"
        disabled={!d.groupId}
        value={d.startDate}
        onChange={(e) => set({ startDate: e.target.value })}
      />
    </div>
  );
}

interface Props {
  l: LeadDto;
  options: LeadOptions;
  onConverted: (studentId: string) => void;
}

/**
 * Lid → o'quvchi (FR-STU-4): telefon/manba liddan ko'chadi; ixtiyoriy ota-ona va guruhga yozish —
 * bitta tranzaksiya. Dublikat (ism + tug'ilgan sana) — "Baribir qo'shish".
 */
export function ConvertForm({ l, options, onConverted }: Props) {
  const save = useLeadCall();
  const [d, setD] = useState<Draft>(() => ({
    fullName: l.fullName,
    birthDate: '',
    guardian: EMPTY_GUARDIAN,
    groupId: l.trial?.group.id ?? '',
    startDate: todayYmd(),
  }));
  const [errors, setErrors] = useState<StudentErrors>({});
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const duplicate = save.error instanceof ApiError && save.error.code === 'POSSIBLE_DUPLICATE';
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = convertBody(d, duplicate);
    setErrors(r.ok ? {} : r.errors);
    if (r.ok)
      save.mutate(
        { path: `/leads/${l.id}/convert`, method: 'POST', body: r.body },
        { onSuccess: (lead) => lead.studentId && onConverted(lead.studentId) },
      );
  };
  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
      <p className="text-xs text-text-muted">{c.hint}</p>
      <Field
        label={c.fullName}
        value={d.fullName}
        onChange={(e) => set({ fullName: e.target.value })}
        error={errors.fullName}
      />
      <Field
        label={sf.birthDate}
        type="date"
        value={d.birthDate}
        onChange={(e) => set({ birthDate: e.target.value })}
      />
      <GuardianFields
        g={d.guardian}
        errors={errors}
        set={(p) => set({ guardian: { ...d.guardian, ...p } })}
      />
      {options.groups.length > 0 && <EnrollFields d={d} groups={options.groups} set={set} />}
      <FormError error={save.error} />
      <Button type="submit" size="sm" className="self-end" loading={save.isPending}>
        {duplicate ? sf.createAnyway : t.leads.convert}
      </Button>
    </form>
  );
}
