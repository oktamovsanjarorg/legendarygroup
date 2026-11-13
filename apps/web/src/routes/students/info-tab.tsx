import type { StudentDetail, StudentGuardian } from '@lg/contracts';
import { formatPhone, formatYmd, webMessages as t } from '@lg/i18n';
import { Button } from '@lg/ui-web';
import { UserPlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { FormError } from '../../components/panel-section.js';
import { GuardiansCard, type GuardianView, InfoCard } from '../../screens/f1/student-card.js';
import { useStudentCall } from './use-students.js';

const c = t.studentCard;
const dash = (v: string | null | undefined): ReactNode =>
  v ?? <span className="text-text-muted">—</span>;

const toView = (g: StudentGuardian): GuardianView => ({
  id: g.guardianId,
  name: g.fullName,
  relation: t.students.relations[g.relation],
  phone: g.phone,
  linked: g.linked,
  primary: g.isPrimary,
});

/** Maktab va sinf bitta qatorda: `64-maktab, 9-sinf`. */
const schoolOf = (s: StudentDetail) => [s.school, s.grade].filter(Boolean).join(', ') || null;

interface Props {
  s: StudentDetail;
  canManage: boolean;
  onAddGuardian: () => void;
}

/** W-06 "Ma'lumot" tabi: shaxsiy ma'lumot (FR-STU-1) va ota-onalar (FR-STU-2). */
export function InfoTab({ s, canManage, onAddGuardian }: Props) {
  const act = useStudentCall();
  const link = (id: string) => `/students/${s.id}/guardians/${id}`;
  const remove = (g: GuardianView) =>
    window.confirm(c.confirmRemoveGuardian.replace('{name}', g.name)) &&
    act.mutate({ path: link(g.id), method: 'DELETE' });
  const rowAction = (g: GuardianView) => (
    <>
      {!g.primary && (
        <Button
          variant="ghost"
          size="sm"
          disabled={act.isPending}
          onClick={() =>
            act.mutate({ path: link(g.id), method: 'PATCH', body: { isPrimary: true } })
          }
        >
          {c.makePrimary}
        </Button>
      )}
      <Button variant="ghost" size="sm" disabled={act.isPending} onClick={() => remove(g)}>
        {c.removeGuardian}
      </Button>
    </>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-4">
        <InfoCard
          rows={[
            [c.birthDate, dash(s.birthDate && formatYmd(s.birthDate))],
            [c.gender, dash(s.gender && t.students.genders[s.gender])],
            [c.phone, dash(s.phone && formatPhone(s.phone))],
            [c.school, dash(schoolOf(s))],
            [c.source, dash(s.source && t.students.sources[s.source])],
            [c.notes, dash(s.notes)],
          ]}
        />
        <GuardiansCard
          guardians={s.guardians.map(toView)}
          action={
            canManage && (
              <Button variant="secondary" size="sm" onClick={onAddGuardian}>
                <UserPlus className="size-4" aria-hidden />
                {c.addGuardian}
              </Button>
            )
          }
          rowAction={canManage ? rowAction : undefined}
        />
      </div>
      <FormError error={act.error} />
    </div>
  );
}
