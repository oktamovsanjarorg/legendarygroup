import { miniappMessages as t } from '@lg/i18n';
import { ApiError, errorText } from '@lg/ui-core';
import { ActionSheet } from '@lg/ui-tg';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import {
  emptyNewStudent,
  newStudentRequest,
  useCreateStudent,
  useFirstMonth,
  useOpenGroups,
} from '../data/staff-new.js';
import { NewStudentView } from '../screens/staff/new-student.js';

const c = t.staffNew;
const isDuplicate = (e: unknown) => e instanceof ApiError && e.code === 'POSSIBLE_DUPLICATE';

/**
 * MS-04a Yangi oʻquvchi (Q-97). Saqlangach: oldingi oydan kelgan bo'lsa — to'lov holati
 * (o'tgan oylar qarzi), aks holda kartochka.
 */
export function StaffNewPage() {
  const navigate = useNavigate();
  const today = useClock().today();
  const groups = useOpenGroups();
  const create = useCreateStudent();
  const [form, setForm] = useState(() => emptyNewStudent(today));
  const save = (allowDuplicate: boolean) =>
    create.mutate(newStudentRequest(form, allowDuplicate), {
      onSuccess: (s) =>
        void navigate({
          to:
            form.startDate.slice(0, 7) < today.slice(0, 7)
              ? '/staff/student/$id/setup'
              : '/staff/student/$id',
          params: { id: s.id },
          replace: true,
        }),
    });
  const duplicate = isDuplicate(create.error);
  const quote = useFirstMonth(form.groupId, form.startDate);
  return (
    <QueryView query={groups}>
      {(list) => (
        <>
          {create.isError && !duplicate && (
            <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
              {errorText(create.error)}
            </p>
          )}
          <NewStudentView
            today={today}
            groups={list}
            form={form}
            saving={create.isPending}
            onForm={setForm}
            onSave={() => save(false)}
            quote={quote.data ?? null}
          />
          <ActionSheet
            open={duplicate}
            title={c.duplicate}
            cancelLabel={t.studentCard.cancel}
            onClose={() => create.reset()}
            actions={[{ label: c.addAnyway, onSelect: () => save(true) }]}
          />
        </>
      )}
    </QueryView>
  );
}
