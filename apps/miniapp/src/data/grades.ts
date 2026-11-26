import type { GradeItemInput, LessonGradesResponse } from '@lg/contracts';
import { ApiError, type ApiClient } from '@lg/ui-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useOnline } from '../use-online.js';
import { useApi } from './deps.js';
import { lessonGrades } from './grades-map.js';
import { lessonQueue } from './lesson-queue.js';

/** Offline baholar (11-ux §7): baho upsert — qayta yuborish xavfsiz (dars×o'quvchi×tur bitta). */
interface QueuedGrades {
  lessonId: string;
  grades: GradeItemInput[];
}
const queue = lessonQueue<QueuedGrades>('lg.grades.queue');

/** FR-GRD-1: dars baholari, shkala va guruhda yoqilgan turlar. */
export function useLessonGrades(lessonId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['grades', lessonId],
    queryFn: async () =>
      lessonGrades(await api.request<LessonGradesResponse>(`/grades/lessons/${lessonId}`)),
  });
}

const post = (api: ApiClient, q: QueuedGrades) =>
  api.request(`/grades/lessons/${q.lessonId}`, { method: 'POST', body: { grades: q.grades } });

const isNetwork = (e: unknown) => !(e instanceof ApiError);

export function useSaveGrades(lessonId: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (grades: GradeItemInput[]): Promise<'saved' | 'queued'> => {
      const item = { lessonId, grades };
      try {
        await post(api, item);
        return 'saved';
      } catch (e) {
        if (!isNetwork(e)) throw e;
        // Shu darsning navbatdagi baholari bilan birlashtiriladi (oxirgi qiymat ustun).
        const prev = queue.queued().find((q) => q.lessonId === lessonId)?.grades ?? [];
        const key = (g: GradeItemInput) => `${g.studentId}:${g.kind}`;
        const merged = new Map([...prev, ...grades].map((g) => [key(g), g]));
        queue.enqueue({ lessonId, grades: [...merged.values()] });
        return 'queued';
      }
    },
    onSuccess: (r) => {
      if (r === 'saved') void qc.invalidateQueries({ queryKey: ['grades', lessonId] });
      void qc.invalidateQueries({ queryKey: ['teacher', 'student'] });
    },
  });
}

/** Aloqa tiklanganda navbatdagi baholarni yuboradi. */
export function useGradesQueueFlush(): void {
  const api = useApi();
  const online = useOnline();
  const qc = useQueryClient();
  useEffect(() => {
    if (!online) return;
    void queue
      .flush(async (q) => {
        try {
          await post(api, q);
          return 'sent';
        } catch (e) {
          return isNetwork(e) ? 'retry' : 'sent';
        }
      })
      .then(() => qc.invalidateQueries({ queryKey: ['grades'] }));
  }, [api, online, qc]);
}
