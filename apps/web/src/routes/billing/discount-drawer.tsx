import { webMessages as t } from '@lg/i18n';
import { Button, Drawer, Field, SelectField } from '@lg/ui-web';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { api } from '../../api/client.js';
import { errorText } from '../../api/errors.js';
import { useDebounced } from '../../lib/use-debounced.js';
import { useEnrollments } from '../students/use-students.js';
import { usePayStudentSearch } from './use-pay-entry.js';

const f = t.discounts.form;
const FORM_ID = 'discount-form';

export interface DiscountGrant {
  enrollmentId: string;
  percent: number;
  reason: string;
  /** `false` — BR-18 limitdan yuqori: Director'ga so'rov (T-119). */
  direct: boolean;
}

function useGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, percent, reason, direct }: DiscountGrant) =>
      direct
        ? api.request(`/billing/enrollments/${enrollmentId}/discount`, {
            method: 'PATCH',
            body: { percent, reason },
          })
        : api.request('/approvals', {
            method: 'POST',
            body: { type: 'discount', payload: { enrollmentId, percent, reason }, reason },
          }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['billing'] });
      void qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

function StudentSearch({ onPick }: { onPick: (id: string, name: string) => void }) {
  const [q, setQ] = useState('');
  const res = usePayStudentSearch(useDebounced(q.trim()));
  return (
    <div className="flex flex-col gap-1">
      <Field label={f.student} value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="flex flex-col">
        {(res.data?.items ?? []).slice(0, 6).map((s) => (
          <li key={s.id}>
            <Button variant="ghost" onClick={() => onPick(s.id, s.fullName)}>
              {s.fullName} · LG-{s.code}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Props {
  limit: number;
  /** Director limitga bog'liq emas (BR-18). */
  unlimited: boolean;
  onDone: (message: string) => void;
  onClose: () => void;
}

/** Forma tekshiruvi: guruh tanlangan, foiz 0–100 butun, sabab ≥ 3 belgi. */
export function validateGrant(enr: string, percent: string, reason: string): string | null {
  if (!enr) return f.pickStudent;
  if (!/^\d{1,3}$/.test(percent) || Number(percent) > 100) return f.percentInvalid;
  return reason.trim().length < 3 ? f.reasonShort : null;
}

function useDiscountForm({
  limit,
  unlimited,
  onDone,
}: Pick<Props, 'limit' | 'unlimited' | 'onDone'>) {
  const grant = useGrant();
  const [student, setStudent] = useState<{ id: string; name: string } | null>(null);
  const enrollments = useEnrollments(student?.id ?? '');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [percent, setPercent] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const direct = unlimited || Number(percent) <= limit;
  const options = (enrollments.data ?? [])
    .filter((e) => e.state !== 'ended')
    .map((e) => ({ value: e.id, label: e.group.name }));
  const enr = enrollmentId || options[0]?.value || '';
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateGrant(enr, percent, reason);
    setError(err);
    if (err) return;
    const body = { enrollmentId: enr, percent: Number(percent), reason: reason.trim(), direct };
    grant.mutate(body, { onSuccess: () => onDone(direct ? f.done : f.sent) });
  };
  const shownError = error ?? (grant.isError ? errorText(grant.error) : null);
  return {
    ...{ grant, student, setStudent, options, enr, setEnrollmentId, percent, setPercent },
    ...{ reason, setReason, direct, submit, shownError },
  };
}

/** W-18 chegirma berish (T-203, BR-18): Admin limiti ichida — darhol; yuqori — so'rov. */
export function DiscountDrawer({ limit, unlimited, onDone, onClose }: Props) {
  const x = useDiscountForm({ limit, unlimited, onDone });
  const { grant, student, setStudent, options, enr, setEnrollmentId, percent, setPercent } = x;
  const { reason, setReason, direct, submit, shownError } = x;
  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={FORM_ID} loading={grant.isPending}>
        {direct ? f.submit : f.request}
      </Button>
    </>
  );
  return (
    <Drawer
      open
      title={t.discounts.grant}
      closeLabel={t.common.close}
      onClose={onClose}
      footer={footer}
    >
      <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-4">
        {student ? (
          <p className="text-sm font-medium text-text">{student.name}</p>
        ) : (
          <StudentSearch onPick={(id, name) => setStudent({ id, name })} />
        )}
        {student && (
          <SelectField
            label={f.enrollment}
            options={options}
            value={enr}
            onChange={(e) => setEnrollmentId(e.target.value)}
          />
        )}
        <Field
          label={f.percent}
          inputMode="numeric"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
        />
        {!direct && percent && (
          <p className="text-sm text-warning">{f.overLimit.replace('{n}', String(limit))}</p>
        )}
        <Field label={f.reason} value={reason} onChange={(e) => setReason(e.target.value)} />
        {shownError && (
          <p role="alert" className="text-sm text-danger">
            {shownError}
          </p>
        )}
      </form>
    </Drawer>
  );
}
