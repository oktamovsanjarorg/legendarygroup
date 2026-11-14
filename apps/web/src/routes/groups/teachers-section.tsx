import {
  AssignTeacherRequest,
  GROUP_TEACHER_ROLES,
  type GroupDetail,
  type GroupTeacher,
  type GroupTeacherRole,
} from '@lg/contracts';
import { formatYmd, webMessages as t } from '@lg/i18n';
import { Badge, Button, Field, SelectField } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { todayYmd } from '../../lib/today.js';
import { ActionError, Section } from './section.js';
import { type FormOptions, useGroupCall } from './use-groups.js';

const d = t.groups.detail;
const ROLE_OPTIONS = GROUP_TEACHER_ROLES.map((r) => ({ value: r, label: d.roles[r] }));
const isRole = (v: string): v is GroupTeacherRole =>
  (GROUP_TEACHER_ROLES as readonly string[]).includes(v);

interface Props {
  g: GroupDetail;
  form: FormOptions;
  canManage: boolean;
}

const period = (a: GroupTeacher) =>
  a.to
    ? d.range.replace('{from}', formatYmd(a.from)).replace('{to}', formatYmd(a.to))
    : d.from.replace('{from}', formatYmd(a.from));

function AssignForm({ g, form, onDone }: Omit<Props, 'canManage'> & { onDone: () => void }) {
  const save = useGroupCall();
  const [teacherId, setTeacher] = useState('');
  const [role, setRole] = useState<GroupTeacherRole>('main');
  const [from, setFrom] = useState(() => (g.startDate > todayYmd() ? g.startDate : todayYmd()));
  const [invalid, setInvalid] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = AssignTeacherRequest.safeParse({ teacherId, role, from });
    setInvalid(!body.success);
    if (body.success)
      save.mutate(
        { path: `/groups/${g.id}/teachers`, method: 'POST', body: body.data },
        { onSuccess: onDone },
      );
  };
  const teachers = [{ value: '', label: t.groups.form.none }, ...form.options.teachers];
  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
      <SelectField
        label={d.teacher}
        options={teachers}
        value={teacherId}
        onChange={(e) => setTeacher(e.target.value)}
        error={invalid && !teacherId ? t.common.required : null}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label={d.role}
          options={ROLE_OPTIONS}
          value={role}
          onChange={(e) => isRole(e.target.value) && setRole(e.target.value)}
        />
        <Field
          label={d.assignFrom}
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>
      <p className="text-xs text-text-muted">{d.assignHint}</p>
      <ActionError error={save.error} nameOf={form.nameOf} />
      <Button type="submit" size="sm" className="self-end" loading={save.isPending}>
        {d.assign}
      </Button>
    </form>
  );
}

/** W-10: ustoz biriktirishlar (asosiy/yordamchi, sanalar bilan — FR-ORG-6). */
export function TeachersSection({ g, form, canManage }: Props) {
  const [open, setOpen] = useState(false);
  const end = useGroupCall();
  const today = todayYmd();
  const current = g.teachers.filter((a) => !a.to || a.to >= today);
  const finish = (a: GroupTeacher) =>
    window.confirm(d.confirmEndAssignment.replace('{name}', a.fullName)) &&
    end.mutate({
      path: `/groups/${g.id}/teachers/${a.id}/end`,
      method: 'POST',
      body: { to: today },
    });
  const toggle = canManage
    ? { label: d.assign, open, onToggle: () => setOpen((o) => !o) }
    : undefined;
  return (
    <Section title={d.teachers} toggle={toggle}>
      {current.length === 0 && <p className="text-sm text-text-muted">{t.groups.noTeacher}</p>}
      <ul className="flex flex-col gap-2">
        {current.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-sm text-text">
            <span className="flex-1">
              {a.fullName}
              <span className="block text-xs text-text-muted">{period(a)}</span>
            </span>
            <Badge tone={a.role === 'main' ? 'info' : 'muted'}>{d.roles[a.role]}</Badge>
            {canManage && !a.to && (
              <Button variant="ghost" size="sm" disabled={end.isPending} onClick={() => finish(a)}>
                {d.endAssignment}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <ActionError error={end.error} nameOf={form.nameOf} />
      {open && <AssignForm g={g} form={form} onDone={() => setOpen(false)} />}
    </Section>
  );
}
