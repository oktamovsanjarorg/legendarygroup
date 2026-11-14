import {
  ACQUISITION_SOURCES,
  CreateLeadRequest,
  type LeadDto,
  LeadExistsDetails,
} from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Drawer, Field, SelectField } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { ApiError } from '../../api/client.js';
import { FormError } from '../../components/panel-section.js';
import { type LeadCall, type LeadOptions, useLeadCall } from './use-leads.js';

const f = t.leads.form;
const NOT_SET = { value: '', label: t.students.form.notSet };
const SOURCES = [
  NOT_SET,
  ...ACQUISITION_SOURCES.map((s) => ({ value: s, label: t.students.sources[s] })),
];

interface Draft {
  fullName: string;
  phone: string;
  courseId: string;
  source: string;
  notes: string;
}

const draftOf = (l?: LeadDto): Draft => ({
  fullName: l?.fullName ?? '',
  phone: l?.phone ?? '+998',
  courseId: l?.course?.id ?? '',
  source: l?.source ?? '',
  notes: l?.notes ?? '',
});

/** Forma → so'rov (API bilan bitta Zod sxema); bo'sh tanlov — `null`. */
export function leadBody(d: Draft) {
  return CreateLeadRequest.safeParse({
    fullName: d.fullName,
    phone: d.phone,
    courseId: d.courseId || null,
    source: d.source || null,
    notes: d.notes.trim() || null,
  });
}

type Errors = Partial<Record<'fullName' | 'phone', string>>;

function fieldErrors(issues: readonly { path: PropertyKey[] }[]): Errors {
  const bad = issues.map((i) => i.path[0]);
  return {
    ...(bad.includes('fullName') ? { fullName: f.errors.fullName } : {}),
    ...(bad.includes('phone') ? { phone: f.errors.phone } : {}),
  };
}

/** 409 `LEAD_EXISTS` → mavjud ochiq lid ID'si. */
const existingLeadId = (e: unknown): string | null => {
  if (!(e instanceof ApiError) || e.code !== 'LEAD_EXISTS') return null;
  const details = LeadExistsDetails.safeParse(e.details);
  return details.success ? details.data.leadId : null;
};

interface Props {
  /** Tahrirlanayotgan lid (yo'q — yangi). */
  lead?: LeadDto;
  options: LeadOptions;
  formId: string;
  onSaved: (l: LeadDto) => void;
  /** Shu telefonli ochiq lid bor — o'shani ochish. */
  onOpenExisting?: (id: string) => void;
}

/** Lid maydonlari (FR-STU-4): yaratish (POST) va tahrirlash (PATCH) uchun bitta forma. */
export function LeadForm({ lead, options, formId, onSaved, onOpenExisting }: Props) {
  const save = useLeadCall();
  const [d, setD] = useState(() => draftOf(lead));
  const [errors, setErrors] = useState<Errors>({});
  const on = (k: keyof Draft) => (e: { target: { value: string } }) =>
    setD((prev) => ({ ...prev, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = leadBody(d);
    setErrors(parsed.success ? {} : fieldErrors(parsed.error.issues));
    if (!parsed.success) return;
    const call: LeadCall = lead
      ? { path: `/leads/${lead.id}`, method: 'PATCH', body: parsed.data }
      : { path: '/leads', method: 'POST', body: parsed.data };
    save.mutate(call, { onSuccess: onSaved });
  };
  const existing = existingLeadId(save.error);
  return (
    <form id={formId} className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <Field
        label={f.fullName}
        autoFocus
        autoComplete="off"
        value={d.fullName}
        onChange={on('fullName')}
        error={errors.fullName}
      />
      <Field
        label={f.phone}
        type="tel"
        autoComplete="off"
        value={d.phone}
        onChange={on('phone')}
        error={errors.phone}
      />
      {options.courses.length > 0 && (
        <SelectField
          label={f.course}
          options={[NOT_SET, ...options.courses]}
          value={d.courseId}
          onChange={on('courseId')}
        />
      )}
      <SelectField label={f.source} options={SOURCES} value={d.source} onChange={on('source')} />
      <Field label={f.notes} autoComplete="off" value={d.notes} onChange={on('notes')} />
      <FormError error={save.error} />
      {existing && onOpenExisting && (
        <Button variant="secondary" size="sm" onClick={() => onOpenExisting(existing)}>
          {f.openExisting}
        </Button>
      )}
      <Button type="submit" className="self-end" loading={save.isPending}>
        {lead ? t.common.save : f.create}
      </Button>
    </form>
  );
}

interface CreateProps {
  options: LeadOptions;
  onOpenExisting: (id: string) => void;
  onClose: () => void;
}

/** W-08: yangi lid. */
export function CreateLeadDrawer({ options, onOpenExisting, onClose }: CreateProps) {
  return (
    <Drawer open title={f.title} closeLabel={t.common.close} onClose={onClose}>
      <LeadForm
        formId="lead-create-form"
        options={options}
        onSaved={onClose}
        onOpenExisting={onOpenExisting}
      />
    </Drawer>
  );
}
