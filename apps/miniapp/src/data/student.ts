import type { GroupListItem, RosterResult } from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StudentComment } from '../screens/teacher/student.js';
import { useApi, useClock } from './deps.js';
import {
  type AttendanceHistoryRow,
  type GradesHistory,
  monthStart,
  studentProfile,
} from './student-map.js';

/** MT-06 o'quvchi profili (ustoz): shu guruhdagi davomat, baholar, izohlar. */
export function useTeacherStudent(groupId: string, studentId: string, meId: string) {
  const api = useApi();
  const clock = useClock();
  const today = clock.today();
  return useQuery({
    queryKey: ['teacher', 'student', groupId, studentId, today],
    queryFn: async () => {
      const [groups, roster, attendance, history] = await Promise.all([
        api.request<GroupListItem[]>('/groups'),
        api.request<RosterResult>(`/groups/${groupId}/students`),
        api.request<AttendanceHistoryRow[]>(
          `/attendance/history?studentId=${studentId}&from=${monthStart(today)}&to=${today}`,
        ),
        api.request<GradesHistory>(`/grades/history?studentId=${studentId}&groupId=${groupId}`),
      ]);
      const group = groups.find((g) => g.id === groupId);
      const student = roster.items.find((r) => r.studentId === studentId);
      if (!group || !student) return null;
      const profile = studentProfile({
        name: student.fullName,
        groupName: group.name,
        today,
        attendance,
        history,
      });
      const lastLesson = attendance.find((r) => r.groupName === group.name)?.lessonId ?? null;
      // Izoh — faqat asosiy ustoz (Q-62) va izoh bog'lanadigan dars bo'lsa.
      const canComment = group.mainTeacher?.id === meId && lastLesson !== null;
      return { profile, canComment, lastLesson };
    },
  });
}

/** Izoh oxirgi darsga yoziladi (BR-37 muddati serverda tekshiriladi). */
export function useAddComment(lessonId: string, studentId: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { text: string; visibility: StudentComment['visibility'] }) =>
      api.request(`/grades/lessons/${lessonId}`, {
        method: 'POST',
        body: {
          grades: [],
          comments: [
            {
              studentId,
              text: v.text,
              visibility: v.visibility === 'parent' ? 'guardian' : 'internal',
            },
          ],
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher', 'student'] }),
  });
}
