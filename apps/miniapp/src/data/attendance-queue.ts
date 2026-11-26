import type { MarkAttendanceInput } from '@lg/contracts';
import { lessonQueue } from './lesson-queue.js';

/**
 * Offline davomat navbati (FR-ATT-6). `clientMutationId` — server tomonda idempotent, qayta
 * yuborish ikki marta yozmaydi.
 */
export interface QueuedMark {
  lessonId: string;
  body: MarkAttendanceInput & { clientMutationId: string };
}

const queue = lessonQueue<QueuedMark>('lg.attendance.queue');
export const { enqueue, queued, flush } = queue;
