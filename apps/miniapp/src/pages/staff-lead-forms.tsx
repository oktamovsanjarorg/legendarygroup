import type { LeadDto } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { ApiError } from '@lg/ui-core';
import { ActionSheet } from '@lg/ui-tg';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import {
  convertRequest,
  existingLeadId,
  leadForm,
  leadRequest,
  useLead,
  useLeadSave,
} from '../data/staff-leads.js';
import { emptyNewStudent, useOpenGroups } from '../data/staff-new.js';
import { useCourses, useUpcomingLessons } from '../data/staff-org.js';
import { LeadFormView, LeadTrialView, ReasonView } from '../screens/staff/lead-forms.js';
import { NewStudentView } from '../screens/staff/new-student.js';
import { ErrorNotice } from './notice.js';

const c = t.leads;

/** Saqlangach lid kartochkasiga (qadam tarixda qolmaydi). */
function useToLead() {
  const navigate = useNavigate();
  return (id: string) => void navigate({ to: '/staff/leads/$id', params: { id }, replace: true });
}

function LeadEditor({ lead }: { lead?: LeadDto }) {
  const toLead = useToLead();
  const courses = useCourses();
  const save = useLeadSave(lead?.id);
  const [form, setForm] = useState(() => leadForm(lead));
  const existing = existingLeadId(save.error);
  return (
    <QueryView query={courses}>
      {(list) => (
        <>
          <ErrorNotice error={save.error} />
          <LeadFormView
            title={lead ? c.edit : c.add}
            form={form}
            courses={list}
            saving={save.isPending}
            onForm={setForm}
            onSave={() =>
              save.mutate({ body: leadRequest(form) }, { onSuccess: (l) => toLead(l.id) })
            }
            onExisting={existing ? () => toLead(existing) : undefined}
          />
        </>
      )}
    </QueryView>
  );
}

export const StaffLeadNewPage = () => <LeadEditor />;

export function StaffLeadEditPage() {
  const { id } = useParams({ from: '/staff/leads/$id/edit' });
  return <QueryView query={useLead(id)}>{(lead) => <LeadEditor lead={lead} />}</QueryView>;
}

export function StaffLeadLostPage() {
  const { id } = useParams({ from: '/staff/leads/$id/lost' });
  const toLead = useToLead();
  const save = useLeadSave(id);
  return (
    <>
      <ErrorNotice error={save.error} />
      <ReasonView
        title={c.to.lost}
        label={c.lostReason}
        action={c.save}
        saving={save.isPending}
        onSave={(lostReason) =>
          save.mutate(
            { path: 'status', body: { status: 'lost', lostReason } },
            { onSuccess: () => toLead(id) },
          )
        }
      />
    </>
  );
}

export function StaffLeadTrialPage() {
  const { id } = useParams({ from: '/staff/leads/$id/trial' });
  const toLead = useToLead();
  const groups = useOpenGroups();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const lessons = useUpcomingLessons(groupId);
  const save = useLeadSave(id);
  return (
    <QueryView query={groups}>
      {(list) => (
        <>
          <ErrorNotice error={save.error ?? lessons.error} />
          <LeadTrialView
            groups={list}
            groupId={groupId}
            lessons={lessons.data ?? []}
            lessonId={lessonId}
            saving={save.isPending}
            onGroup={(g) => {
              setGroupId(g);
              setLessonId(null);
            }}
            onLesson={setLessonId}
            onSave={() =>
              save.mutate({ path: 'trial', body: { lessonId } }, { onSuccess: () => toLead(id) })
            }
          />
        </>
      )}
    </QueryView>
  );
}

function ConvertForm({ lead }: { lead: LeadDto }) {
  const navigate = useNavigate();
  const today = useClock().today();
  const groups = useOpenGroups();
  const save = useLeadSave(lead.id);
  const [form, setForm] = useState(() => ({
    ...emptyNewStudent(today),
    fullName: lead.fullName,
    guardianPhone: lead.phone,
  }));
  const duplicate = save.error instanceof ApiError && save.error.code === 'POSSIBLE_DUPLICATE';
  const submit = (allowDuplicate: boolean) =>
    save.mutate(
      { path: 'convert', body: convertRequest(form, allowDuplicate) },
      {
        onSuccess: (l) =>
          l.studentId &&
          void navigate({ to: '/staff/student/$id', params: { id: l.studentId }, replace: true }),
      },
    );
  return (
    <QueryView query={groups}>
      {(list) => (
        <>
          {!duplicate && <ErrorNotice error={save.error} />}
          <NewStudentView
            title={c.convert}
            saveText={c.convertSave}
            groupTitle={c.convertGroup}
            groupOptional
            today={today}
            groups={list}
            form={form}
            saving={save.isPending}
            onForm={setForm}
            onSave={() => submit(false)}
          />
          <ActionSheet
            open={duplicate}
            title={t.staffNew.duplicate}
            cancelLabel={t.studentCard.cancel}
            onClose={() => save.reset()}
            actions={[{ label: t.staffNew.addAnyway, onSelect: () => submit(true) }]}
          />
        </>
      )}
    </QueryView>
  );
}

export function StaffLeadConvertPage() {
  const { id } = useParams({ from: '/staff/leads/$id/convert' });
  return <QueryView query={useLead(id)}>{(lead) => <ConvertForm lead={lead} />}</QueryView>;
}
