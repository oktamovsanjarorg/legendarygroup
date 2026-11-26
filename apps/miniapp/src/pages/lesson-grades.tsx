import { errorText } from '@lg/ui-core';
import { useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useLessonAttendance } from '../data/attendance.js';
import { useClock } from '../data/deps.js';
import { useLessonGrades, useSaveGrades } from '../data/grades.js';
import { QueryView } from '../data/query-view.js';
import { editDeadline } from '../data/student-map.js';
import { GradesView } from '../screens/teacher/grades.js';

/** MT-02b baho qo'yish (T-301, FR-GRD-1, BR-33/37): ro'yxat davomatdan, baholar — serverdan. */
export function LessonGradesPage() {
  const { id } = useParams({ from: '/lesson/$id/grades' });
  const clock = useClock();
  const att = useLessonAttendance(id);
  const grades = useLessonGrades(id);
  const save = useSaveGrades(id);
  const [result, setResult] = useState<'saved' | 'queued' | null>(null);
  return (
    <QueryView query={att} rows={8}>
      {(a) => (
        <QueryView query={grades} rows={8}>
          {(gr) => (
            <>
              {save.isError && (
                <p
                  role="alert"
                  className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger"
                >
                  {errorText(save.error)}
                </p>
              )}
              <GradesView
                lesson={a.lesson}
                students={a.students}
                absent={
                  new Set(
                    Object.entries(a.saved ?? {})
                      .filter(([, m]) => m.kind === 'absent')
                      .map(([sid]) => sid),
                  )
                }
                grades={gr}
                locked={clock.nowMs() > editDeadline(gr.date).getTime()}
                saving={save.isPending}
                result={result}
                onSave={(items) => save.mutate(items, { onSuccess: setResult })}
              />
            </>
          )}
        </QueryView>
      )}
    </QueryView>
  );
}
