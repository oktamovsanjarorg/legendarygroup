import { errorText } from '@lg/ui-core';
import { useParams } from '@tanstack/react-router';
import { QueryView } from '../data/query-view.js';
import { useTeacherGroup } from '../data/teacher.js';
import { useSaveTeacherCodes, useTeacherCodes } from '../data/teacher-codes.js';
import { CodesView } from '../screens/teacher/codes.js';
import { useMe } from '../session/session.js';
import { useOnline } from '../use-online.js';

/** MT-05a Oʻquvchi kodlari — titul va Excel import uchun (T-128, Q-92). */
export function TeacherCodesPage() {
  const { id } = useParams({ from: '/group/$id/codes' });
  const me = useMe();
  const online = useOnline();
  const groupQuery = useTeacherGroup(id, me.id);
  const codesQuery = useTeacherCodes(id);
  const save = useSaveTeacherCodes(id);

  return (
    <QueryView query={codesQuery}>
      {(d) => (
        <CodesView
          // Saqlangach serverdan kelgan roʻyxat bilan forma qayta boshlanadi.
          key={codesQuery.dataUpdatedAt}
          groupName={groupQuery.data?.group.name ?? ''}
          rows={d.items}
          saving={save.isPending}
          saved={save.isSuccess}
          error={save.error ? errorText(save.error) : undefined}
          onSave={(items) => online && !save.isPending && save.mutate(items)}
        />
      )}
    </QueryView>
  );
}
