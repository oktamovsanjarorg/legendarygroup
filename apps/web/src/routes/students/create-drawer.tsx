import type { StudentDetail } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Drawer } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { ApiError } from '../../api/client.js';
import { FormError } from '../../components/panel-section.js';
import { createBody, EMPTY_GUARDIAN, EMPTY_STUDENT, type StudentErrors } from './student-draft.js';
import { GuardianFields, StudentFields } from './student-fields.js';
import { useStudentCall } from './use-students.js';

const f = t.students.form;
const FORM_ID = 'student-create-form';

interface Match {
  id: string;
  code: number;
  fullName: string;
}

/** 409 `POSSIBLE_DUPLICATE` tafsiloti (Q-68): o'xshash o'quvchilar. */
function duplicatesOf(e: unknown): Match[] {
  if (!(e instanceof ApiError) || e.code !== 'POSSIBLE_DUPLICATE') return [];
  const matches = (e.details as { matches?: Match[] } | undefined)?.matches;
  return Array.isArray(matches) ? matches : [];
}

function Duplicates({ matches }: { matches: readonly Match[] }) {
  return (
    <div role="alert" className="flex flex-col gap-1 rounded-md bg-warning-bg p-3 text-sm">
      <p className="font-medium text-warning">{f.duplicateTitle}</p>
      <ul className="text-text">
        {matches.map((m) => (
          <li key={m.id}>
            LG-{m.code} · {m.fullName}
          </li>
        ))}
      </ul>
      <p className="text-text-muted">{f.duplicateHint}</p>
    </div>
  );
}

interface Props {
  onCreated: (id: string) => void;
  onClose: () => void;
}

/** W-05: yangi o'quvchi (FR-STU-1/2) — ota-ona bilan; dublikat ogohlantirishi (ism + tug'ilgan sana). */
export function CreateDrawer({ onCreated, onClose }: Props) {
  const create = useStudentCall<StudentDetail>();
  const [d, setD] = useState(EMPTY_STUDENT);
  const [g, setG] = useState(EMPTY_GUARDIAN);
  const [errors, setErrors] = useState<StudentErrors>({});
  const duplicates = duplicatesOf(create.error);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = createBody(d, g, duplicates.length > 0);
    setErrors(r.ok ? {} : r.errors);
    if (r.ok)
      create.mutate(
        { path: '/students', method: 'POST', body: r.body },
        { onSuccess: (s) => onCreated(s.id) },
      );
  };
  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={FORM_ID} loading={create.isPending}>
        {duplicates.length > 0 ? f.createAnyway : f.create}
      </Button>
    </>
  );
  return (
    <Drawer open title={f.title} closeLabel={t.common.close} onClose={onClose} footer={footer}>
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <StudentFields d={d} errors={errors} set={(p) => setD((prev) => ({ ...prev, ...p }))} />
        <fieldset className="flex flex-col gap-4 border-t border-border pt-4">
          <legend className="text-sm font-semibold text-text">{f.guardianTitle}</legend>
          <p className="text-xs text-text-muted">{f.guardianHint}</p>
          <GuardianFields g={g} errors={errors} set={(p) => setG((prev) => ({ ...prev, ...p }))} />
        </fieldset>
        {duplicates.length > 0 ? (
          <Duplicates matches={duplicates} />
        ) : (
          <FormError error={create.error} />
        )}
      </form>
    </Drawer>
  );
}
