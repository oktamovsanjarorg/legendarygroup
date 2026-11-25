import type { GroupListItem, LessonAttendance, LessonDto } from '@lg/contracts';
import { ApiError, type ApiClient } from '@lg/ui-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Marks } from '../screens/teacher/attendance-marks.js';
import { useOnline } from '../use-online.js';
import { enqueue, flush, type QueuedMark } from './attendance-queue.js';
import { QUIET_MS, roster, savedMarks, toItems } from './attendance-map.js';
import { useApi, useClock } from './deps.js';
import { courseNames, lessonInfo } from './teacher-map.js';

/** MT-02 davomat (T-111): dars + ro'yxat + saqlangan belgilar. */
export function useLessonAttendance(lessonId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['attendance', lessonId],
    queryFn: async () => {
      const [lesson, att, groups] = await Promise.all([
        api.request<LessonDto>(`/lessons/${lessonId}`),
        api.request<LessonAttendance>(`/attendance/lessons/${lessonId}`),
        api.request<GroupListItem[]>('/groups'),
      ]);
      return {
        lesson: lessonInfo(lesson, courseNames(groups)),
        students: roster(att),
        saved: savedMarks(att),
        canEdit: att.canEdit,
        date: att.date,
      };
    },
  });
}

const post = (api: ApiClient, q: QueuedMark) =>
  api.request<LessonAttendance>(`/attendance/lessons/${q.lessonId}`, {
    method: 'POST',
    body: q.body,
  });

/** Tarmoq xatosi (javob yo'q) — navbatga; server javobi (ApiError) — foydalanuvchiga. */
const isNetwork = (e: unknown) => !(e instanceof ApiError);

export interface MarkInput {
  marks: Marks;
  /** BR-30: o'tgan kun — sabab bilan. */
  reason?: string;
}

export type SaveResult = { kind: 'saved'; quietUntil: Date } | { kind: 'queued' };

export function useMarkAttendance(lessonId: string) {
  const api = useApi();
  const clock = useClock();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ marks, reason }: MarkInput): Promise<SaveResult> => {
      const item: QueuedMark = {
        lessonId,
        body: {
          clientMutationId: crypto.randomUUID(),
          items: toItems(marks),
          ...(reason ? { changeReason: reason } : {}),
        },
      };
      try {
        await post(api, item);
        return { kind: 'saved', quietUntil: new Date(clock.nowMs() + QUIET_MS) };
      } catch (e) {
        if (!isNetwork(e)) throw e;
        enqueue(item);
        return { kind: 'queued' };
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['teacher', 'today'] });
      await qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

/** Aloqa tiklanganda (va ilova ochilganda) offline navbatni yuboradi (FR-ATT-6). */
export function useAttendanceQueueFlush(): void {
  const api = useApi();
  const online = useOnline();
  const qc = useQueryClient();
  useEffect(() => {
    if (!online) return;
    void flush(async (q) => {
      try {
        await post(api, q);
        return 'sent';
      } catch (e) {
        return isNetwork(e) ? 'retry' : 'sent';
      }
    }).then(() => qc.invalidateQueries({ queryKey: ['teacher'] }));
  }, [api, online, qc]);
}
