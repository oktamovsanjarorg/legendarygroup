import { Injectable } from '@nestjs/common';
import { lessons, type Transaction } from '@lg/db';
import { and, eq } from 'drizzle-orm';

/**
 * Dars o'tdi (`done`) — davomat belgilanganda. O'tgan dars jadval o'zgarganda, guruh
 * to'xtatilganda yoki yakunlanganda o'chirilmaydi (ilgari o'chib, davomat ham yo'qolardi) va
 * ko'chirilmaydi.
 */
@Injectable()
export class LessonHeldService {
  async markHeld(tx: Transaction, lessonId: string): Promise<void> {
    await tx
      .update(lessons)
      .set({ status: 'done' })
      .where(and(eq(lessons.id, lessonId), eq(lessons.status, 'scheduled')));
  }
}
