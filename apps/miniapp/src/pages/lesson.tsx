import { errorText } from '@lg/ui-core';
import { useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { type SaveResult, useLessonAttendance, useMarkAttendance } from '../data/attendance.js';
import { QueryView } from '../data/query-view.js';
import { AttendanceView } from '../screens/teacher/attendance.js';

/** MT-02 davomat belgilash (T-111, FR-ATT-1/2/6, BR-30/31). */
export function LessonAttendancePage() {
  const { id } = useParams({ from: '/lesson/$id' });
  const query = useLessonAttendance(id);
  const mark = useMarkAttendance(id);
  const [result, setResult] = useState<SaveResult | null>(null);
  return (
    <QueryView query={query} rows={8}>
      {(d) => (
        <>
          {mark.isError && (
            <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
              {errorText(mark.error)}
            </p>
          )}
          <AttendanceView
            lesson={d.lesson}
            students={d.students}
            saved={d.saved}
            saving={mark.isPending}
            quietUntil={result?.kind === 'saved' ? result.quietUntil : null}
            queuedOffline={result?.kind === 'queued'}
            onSave={(marks) => mark.mutate(marks, { onSuccess: setResult })}
          />
        </>
      )}
    </QueryView>
  );
}
