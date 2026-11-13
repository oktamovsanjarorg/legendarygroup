import { LinkGuardianRequest, type StudentDetail } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Drawer } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { FormError } from '../../components/panel-section.js';
import { EnrollForm, type GroupOption } from './enrollment-forms.js';
import { draftOf, EMPTY_GUARDIAN, type StudentErrors, updateBody } from './student-draft.js';
import { GuardianFields, StudentFields } from './student-fields.js';
import { useStudentCall } from './use-students.js';

const f = t.students.form;

interface Props {
  s: StudentDetail;
  onClose: () => void;
}

function footer(formId: string, pending: boolean, onClose: () => void) {
  return (
    <>
      <Button variant="secondary" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={formId} loading={pending}>
        {t.common.save}
      </Button>
    </>
  );
}

/** W-06: o'quvchi ma'lumotini tahrirlash (PATCH). */
export function EditDrawer({ s, onClose }: Props) {
  const save = useStudentCall();
  const [d, setD] = useState(() => draftOf(s));
  const [errors, setErrors] = useState<StudentErrors>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = updateBody(d);
    setErrors(r.ok ? {} : r.errors);
    if (r.ok)
      save.mutate(
        { path: `/students/${s.id}`, method: 'PATCH', body: r.body },
        { onSuccess: onClose },
      );
  };
  return (
    <Drawer
      open
      title={f.editTitle}
      closeLabel={t.common.close}
      onClose={onClose}
      footer={footer('student-edit-form', save.isPending, onClose)}
    >
      <form id="student-edit-form" className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <StudentFields d={d} errors={errors} set={(p) => setD((prev) => ({ ...prev, ...p }))} />
        <FormError error={save.error} />
      </form>
    </Drawer>
  );
}

/** W-06: ota-ona bog'lash (FR-STU-2) — telefon bazada bo'lsa, o'sha ota-ona ulanadi. */
export function GuardianDrawer({ s, onClose }: Props) {
  const save = useStudentCall();
  const [g, setG] = useState(EMPTY_GUARDIAN);
  const [isPrimary, setPrimary] = useState(s.guardians.length === 0);
  const [notify, setNotify] = useState(true);
  const [errors, setErrors] = useState<StudentErrors>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = LinkGuardianRequest.safeParse({ ...g, isPrimary, notify });
    const bad = parsed.success ? [] : parsed.error.issues.map((i) => i.path[0]);
    setErrors({
      ...(bad.includes('fullName') ? { guardianName: f.errors.guardianName } : {}),
      ...(bad.includes('phone') ? { guardianPhone: f.errors.guardianPhone } : {}),
    });
    if (parsed.success)
      save.mutate(
        { path: `/students/${s.id}/guardians`, method: 'POST', body: parsed.data },
        { onSuccess: onClose },
      );
  };
  const check = (label: string, checked: boolean, set: (v: boolean) => void) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
      <input
        type="checkbox"
        className="size-4 accent-primary"
        checked={checked}
        onChange={(e) => set(e.target.checked)}
      />
      {label}
    </label>
  );
  return (
    <Drawer
      open
      title={t.studentCard.addGuardian}
      closeLabel={t.common.close}
      onClose={onClose}
      footer={footer('guardian-form', save.isPending, onClose)}
    >
      <form id="guardian-form" className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <GuardianFields g={g} errors={errors} set={(p) => setG((prev) => ({ ...prev, ...p }))} />
        {check(f.primary, isPrimary, setPrimary)}
        {check(f.notify, notify, setNotify)}
        <FormError error={save.error} />
      </form>
    </Drawer>
  );
}

/** W-06: guruhga yozish (FR-STU-3). */
export function EnrollDrawer({ s, groups, onClose }: Props & { groups: readonly GroupOption[] }) {
  return (
    <Drawer open title={t.studentCard.enroll} closeLabel={t.common.close} onClose={onClose}>
      <EnrollForm studentId={s.id} groups={groups} onDone={onClose} />
    </Drawer>
  );
}
