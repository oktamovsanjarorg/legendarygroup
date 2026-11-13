import { Inject, Injectable } from '@nestjs/common';
import type { AbsenceNoticeStatus } from '@lg/contracts';
import { absenceNotices, type Database, students, users } from '@lg/db';
import { and, desc, eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface CreateAbsenceNoticeInput {
  branchId: string;
  studentId: string;
  guardianUserId: string;
  date: string;
  reason: string;
}

@Injectable()
export class AbsenceNoticesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  /** Yangi oldindan sababli xabarnoma saqlash */
  async create(input: CreateAbsenceNoticeInput) {
    const [row] = await this.db
      .insert(absenceNotices)
      .values({
        branchId: input.branchId,
        studentId: input.studentId,
        guardianUserId: input.guardianUserId,
        date: input.date,
        reason: input.reason,
        status: 'pending',
      })
      .returning();
    if (!row) throw new Error('Absence notice not created');
    return row;
  }

  /** Talaba va sana bo'yicha topish */
  async findByStudentAndDate(studentId: string, date: string) {
    const [row] = await this.db
      .select()
      .from(absenceNotices)
      .where(and(eq(absenceNotices.studentId, studentId), eq(absenceNotices.date, date)));
    return row ?? null;
  }

  /** Guruh yoki talabalar sanasidagi sababli xabarlarni xaritalash */
  async findMapByStudentsAndDate(studentIds: string[], date: string): Promise<Map<string, string>> {
    if (studentIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        studentId: absenceNotices.studentId,
        reason: absenceNotices.reason,
      })
      .from(absenceNotices)
      .where(and(eq(absenceNotices.date, date)));

    const map = new Map<string, string>();
    for (const r of rows) {
      if (studentIds.includes(r.studentId)) {
        map.set(r.studentId, r.reason);
      }
    }
    return map;
  }

  /** Xabarnomalar ro'yxati */
  async list(params: {
    branchId: string;
    studentId?: string;
    date?: string;
    status?: AbsenceNoticeStatus;
    limit: number;
    offset: number;
  }) {
    const conditions = [eq(absenceNotices.branchId, params.branchId)];
    if (params.studentId) conditions.push(eq(absenceNotices.studentId, params.studentId));
    if (params.date) conditions.push(eq(absenceNotices.date, params.date));
    if (params.status) conditions.push(eq(absenceNotices.status, params.status));

    const rows = await this.db
      .select({
        notice: absenceNotices,
        studentName: students.fullName,
        guardianName: users.fullName,
      })
      .from(absenceNotices)
      .innerJoin(students, eq(students.id, absenceNotices.studentId))
      .innerJoin(users, eq(users.id, absenceNotices.guardianUserId))
      .where(and(...conditions))
      .orderBy(desc(absenceNotices.createdAt))
      .limit(params.limit)
      .offset(params.offset);

    return rows;
  }

  /** Xabarnoma holatini yangilash */
  async updateStatus(id: string, status: AbsenceNoticeStatus) {
    const [row] = await this.db
      .update(absenceNotices)
      .set({ status, updatedAt: new Date() })
      .where(eq(absenceNotices.id, id))
      .returning();
    return row ?? null;
  }
}
