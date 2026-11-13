import { normalizePhone, STAFF_ROLES, type StaffInvite, type StaffRole } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Drawer, Field, SelectField } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { InviteLink } from './invite-link.js';
import { errorText } from '../../api/errors.js';
import { useCreateStaff } from './use-staff.js';

const f = t.staff.form;
const FORM_ID = 'staff-invite-form';
const ROLE_OPTIONS = STAFF_ROLES.map((r) => ({ value: r, label: t.roles[r] }));
const isStaffRole = (v: string): v is StaffRole => (STAFF_ROLES as readonly string[]).includes(v);

interface FormProps {
  error: string | null;
  onSubmit: (v: { fullName: string; phone: string; role: StaffRole }) => void;
}

function InviteForm({ error, onSubmit }: FormProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [role, setRole] = useState<StaffRole>('teacher');
  const [touched, setTouched] = useState(false);
  const normalized = normalizePhone(phone);
  const nameOk = fullName.trim().length >= 2;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (normalized && nameOk) onSubmit({ fullName: fullName.trim(), phone: normalized, role });
  };
  return (
    <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <Field
        label={f.fullName}
        autoFocus
        autoComplete="off"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={touched && !nameOk ? f.nameInvalid : null}
      />
      <Field
        label={f.phone}
        type="tel"
        autoComplete="off"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={touched && !normalized ? f.phoneInvalid : null}
      />
      <SelectField
        label={f.role}
        options={ROLE_OPTIONS}
        value={role}
        onChange={(e) => isStaffRole(e.target.value) && setRole(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

/** W-28: xodim qo'shish (telefon, ism, rol — FR-AUTH-5) → taklif havolasi. */
export function InviteDrawer({ onClose }: { onClose: () => void }) {
  const create = useCreateStaff();
  const [result, setResult] = useState<{ invite: StaffInvite | null } | null>(null);
  const footer = result ? (
    <Button onClick={onClose}>{t.staff.inviteLink.done}</Button>
  ) : (
    <>
      <Button variant="secondary" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={FORM_ID} loading={create.isPending}>
        {f.submit}
      </Button>
    </>
  );
  return (
    <Drawer open title={f.title} closeLabel={t.common.close} onClose={onClose} footer={footer}>
      {result ? (
        <InviteLink invite={result.invite} />
      ) : (
        <InviteForm
          error={create.isError ? errorText(create.error) : null}
          onSubmit={(v) => create.mutate(v, { onSuccess: (r) => setResult({ invite: r.invite }) })}
        />
      )}
    </Drawer>
  );
}
