import type { GroupListItem, StudentDetail } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, ErrorState, ForbiddenState, LoadingState } from '@lg/ui-web';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Archive, ArchiveRestore, ChevronLeft, Pencil, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { FormError } from '../../components/panel-section.js';
import { type CardTab, StudentCardView } from '../../screens/f1/student-card.js';
import { EnrollmentsTab } from './enrollments-tab.js';
import { InfoTab } from './info-tab.js';
import { EditDrawer, EnrollDrawer, GuardianDrawer } from './student-drawers.js';
import { useStudent, useStudentCall } from './use-students.js';

const c = t.studentCard;
/** Davomat, baholar, hisob, cheklar tablari — o'z vazifalari bilan (T-112, T-301, T-202, T-207). */
const TABS: readonly CardTab[] = ['info', 'groups'];
type Panel = 'edit' | 'guardian' | 'enroll' | null;

const useGroupOptions = (enabled: boolean) =>
  useQuery({
    queryKey: ['groups', 'list', 'current'],
    queryFn: () => api.request<GroupListItem[]>('/groups?status=current'),
    enabled,
    select: (gs) => gs.map((g) => ({ value: g.id, label: g.name })),
  }).data ?? [];

interface ActionsProps {
  s: StudentDetail;
  onPanel: (p: Panel) => void;
}

function Actions({ s, onPanel }: ActionsProps) {
  const act = useStudentCall();
  const archived = Boolean(s.archivedAt);
  const toggleArchive = () => {
    const sure = archived || window.confirm(c.confirmArchive.replace('{name}', s.fullName));
    if (sure)
      act.mutate({ path: `/students/${s.id}/${archived ? 'restore' : 'archive'}`, method: 'POST' });
  };
  return (
    <>
      <FormError error={act.error} />
      <Button variant="ghost" loading={act.isPending} onClick={toggleArchive}>
        {archived ? (
          <ArchiveRestore className="size-4" aria-hidden />
        ) : (
          <Archive className="size-4" aria-hidden />
        )}
        {archived ? t.common.restore : t.common.archive}
      </Button>
      {!archived && (
        <>
          <Button variant="secondary" onClick={() => onPanel('edit')}>
            <Pencil className="size-4" aria-hidden />
            {c.edit}
          </Button>
          <Button onClick={() => onPanel('enroll')}>
            <UserPlus className="size-4" aria-hidden />
            {c.enroll}
          </Button>
        </>
      )}
    </>
  );
}

function Card({ s, canManage }: { s: StudentDetail; canManage: boolean }) {
  const [tab, setTab] = useState<CardTab>('info');
  const [panel, setPanel] = useState<Panel>(null);
  const groups = useGroupOptions(canManage);
  const close = () => setPanel(null);
  const editable = canManage && !s.archivedAt;
  return (
    <>
      <StudentCardView
        s={{ name: s.fullName, code: `LG-${s.code}`, status: s.archivedAt ? 'archived' : 'active' }}
        tab={tab}
        tabs={TABS}
        actions={canManage && <Actions s={s} onPanel={setPanel} />}
        onTab={setTab}
      >
        {tab === 'groups' ? (
          <EnrollmentsTab studentId={s.id} groups={groups} canManage={editable} />
        ) : (
          <InfoTab s={s} canManage={editable} onAddGuardian={() => setPanel('guardian')} />
        )}
      </StudentCardView>
      {panel === 'edit' && <EditDrawer s={s} onClose={close} />}
      {panel === 'guardian' && <GuardianDrawer s={s} onClose={close} />}
      {panel === 'enroll' && (
        <EnrollDrawer
          s={s}
          groups={groups}
          onClose={() => {
            close();
            setTab('groups');
          }}
        />
      )}
    </>
  );
}

/** W-06 O'quvchi kartochkasi (T-105/T-106): `student.view`; o'zgartirish — `student.manage`. */
export function StudentCardPage({ id }: { id: string }) {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  const student = useStudent(id);
  if (!permissions.has('student.view'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return (
    <>
      <Link
        to="/students"
        className="mb-3 inline-flex items-center gap-1 text-sm text-link hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {c.back}
      </Link>
      {student.isPending ? (
        <LoadingState rows={5} />
      ) : student.isError ? (
        <ErrorState {...errorView(student.error, () => void student.refetch())} />
      ) : (
        <Card s={student.data} canManage={permissions.has('student.manage')} />
      )}
    </>
  );
}
