import type { EnrollmentDto, FreezeDto } from '@lg/contracts';
import { formatYmd, webMessages as t } from '@lg/i18n';
import {
  Badge,
  type BadgeTone,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@lg/ui-web';
import { useState } from 'react';
import { errorView } from '../../api/errors.js';
import { FormError, Section } from '../../components/panel-section.js';
import { todayYmd } from '../../lib/today.js';
import { EndForm, FreezeForm, type GroupOption, TransferForm } from './enrollment-forms.js';
import { useEnrollments, useStudentCall } from './use-students.js';

const m = t.studentCard.enrollments;
const TONE: Record<EnrollmentDto['state'], BadgeTone> = {
  upcoming: 'info',
  active: 'success',
  frozen: 'warning',
  ended: 'muted',
};
const span = (from: string, to: string | null) =>
  to
    ? m.range.replace('{from}', formatYmd(from)).replace('{to}', formatYmd(to))
    : m.from.replace('{from}', formatYmd(from));

interface FreezeProps {
  enrollmentId: string;
  f: FreezeDto;
  canManage: boolean;
}

/** Muzlatish qatori: boshlanmagani — bekor qilinadi; davom etayotgani — bugun tugatiladi. */
function FreezeRow({ enrollmentId, f, canManage }: FreezeProps) {
  const act = useStudentCall();
  const today = todayYmd();
  const base = `/enrollments/${enrollmentId}/freezes/${f.id}`;
  const upcoming = f.from > today;
  const running = f.from <= today && f.to > today;
  return (
    <li className="flex flex-wrap items-center gap-2 text-sm text-text">
      <span className="tabular-nums">{span(f.from, f.to)}</span>
      <span className="flex-1 text-text-muted">{f.reason}</span>
      {canManage && upcoming && (
        <Button
          variant="ghost"
          size="sm"
          loading={act.isPending}
          onClick={() => act.mutate({ path: base, method: 'DELETE' })}
        >
          {m.cancelFreeze}
        </Button>
      )}
      {canManage && running && (
        <Button
          variant="ghost"
          size="sm"
          loading={act.isPending}
          onClick={() => act.mutate({ path: `${base}/end`, method: 'POST', body: { to: today } })}
        >
          {m.endFreeze}
        </Button>
      )}
      <FormError error={act.error} />
    </li>
  );
}

type Open = 'transfer' | 'freeze' | 'end' | null;

interface CardProps {
  e: EnrollmentDto;
  groups: readonly GroupOption[];
  canManage: boolean;
}

function EnrollmentCard({ e, groups, canManage }: CardProps) {
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const toggle = (k: Open, label: string) => ({
    label,
    open: open === k,
    onToggle: () => setOpen(open === k ? null : k),
  });
  const editable = canManage && e.state !== 'ended';
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-text">{e.group.name}</span>
        <Badge tone={TONE[e.state]}>{m.states[e.state]}</Badge>
        <span className="text-sm tabular-nums text-text-muted">{span(e.startDate, e.endDate)}</span>
        {e.endReason && <span className="text-sm text-text-muted">· {m.reasons[e.endReason]}</span>}
      </div>
      {e.freezes.length > 0 && (
        <Section title={m.freezes}>
          <ul className="flex flex-col gap-1">
            {e.freezes.map((f) => (
              <FreezeRow key={f.id} enrollmentId={e.id} f={f} canManage={editable} />
            ))}
          </ul>
        </Section>
      )}
      {editable && (
        <>
          <Section title={m.freeze} toggle={toggle('freeze', m.freeze)}>
            {open === 'freeze' && <FreezeForm e={e} onDone={close} />}
          </Section>
          <Section title={m.transfer} toggle={toggle('transfer', m.transferSubmit)}>
            {open === 'transfer' && <TransferForm e={e} groups={groups} onDone={close} />}
          </Section>
          <Section title={m.end} toggle={toggle('end', m.end)}>
            {open === 'end' && <EndForm e={e} onDone={close} />}
          </Section>
        </>
      )}
    </Card>
  );
}

interface Props {
  studentId: string;
  groups: readonly GroupOption[];
  canManage: boolean;
}

/** W-06 "Guruhlar" tabi (T-106, FR-STU-3): yozilishlar tarixi, muzlatish, ko'chirish, chiqarish. */
export function EnrollmentsTab({ studentId, groups, canManage }: Props) {
  const list = useEnrollments(studentId);
  if (list.isPending) return <LoadingState rows={3} />;
  if (list.isError) return <ErrorState {...errorView(list.error, () => void list.refetch())} />;
  if (list.data.length === 0) return <EmptyState title={m.empty} />;
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {list.data.map((e) => (
        <EnrollmentCard key={e.id} e={e} groups={groups} canManage={canManage} />
      ))}
    </div>
  );
}
