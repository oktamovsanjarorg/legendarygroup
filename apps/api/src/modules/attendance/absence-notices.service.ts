import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  type AbsenceNoticeItem,
  type AbsenceNoticeStatus,
  type CreateAbsenceNoticeRequest,
  DEFAULT_BRANCH_ID,
  type ListAbsenceNoticesQuery,
} from '@lg/contracts';
import { type Database, guardians, studentGuardians, students } from '@lg/db';
import { and, eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { AbsenceNoticesRepository } from './absence-notices.repository.js';

@Injectable()
export class AbsenceNoticesService {
  constructor(
    @Inject(AbsenceNoticesRepository) private readonly repo: AbsenceNoticesRepository,
    @Inject(DB_TOKEN) private readonly db: Database,
  ) {}

  private async isParentOf(guardianUserId: string, studentId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: studentGuardians.studentId })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(and(eq(guardians.userId, guardianUserId), eq(studentGuardians.studentId, studentId)));
    return Boolean(row);
  }

  private async findStudentName(studentId: string): Promise<string> {
    const [row] = await this.db
      .select({ fullName: students.fullName })
      .from(students)
      .where(eq(students.id, studentId));
    return row ? row.fullName : '—';
  }

  /** Oldindan sababli yo'qlik xabarini berish (FR-ATT-7) */
  async createNotice(
    actor: RequestUser,
    dto: CreateAbsenceNoticeRequest,
  ): Promise<AbsenceNoticeItem> {
    if (actor.role === 'guardian') {
      const allowed = await this.isParentOf(actor.id, dto.studentId);
      if (!allowed) {
        throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
      }
    }

    const row = await this.repo.create({
      branchId: (dto as { branchId?: string }).branchId ?? DEFAULT_BRANCH_ID,
      studentId: dto.studentId,
      guardianUserId: actor.id,
      date: dto.date,
      reason: dto.reason,
    });

    const studentName = await this.findStudentName(dto.studentId);

    return {
      id: row.id,
      branchId: row.branchId,
      studentId: row.studentId,
      studentName,
      guardianUserId: row.guardianUserId,
      guardianName: actor.id,
      date: row.date,
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Sababli xabarlar ro'yxati */
  async listNotices(
    actor: RequestUser,
    query: ListAbsenceNoticesQuery,
  ): Promise<{ items: AbsenceNoticeItem[] }> {
    const rows = await this.repo.list({
      branchId: (query as { branchId?: string }).branchId ?? DEFAULT_BRANCH_ID,
      studentId: query.studentId,
      date: query.date,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });

    // Ota-ona faqat o'z farzandlarini ko'radi
    const filtered =
      actor.role === 'guardian' ? rows.filter((r) => r.notice.guardianUserId === actor.id) : rows;

    return {
      items: filtered.map((r) => ({
        id: r.notice.id,
        branchId: r.notice.branchId,
        studentId: r.notice.studentId,
        studentName: r.studentName,
        guardianUserId: r.notice.guardianUserId,
        guardianName: r.guardianName,
        date: r.notice.date,
        reason: r.notice.reason,
        status: r.notice.status,
        createdAt: r.notice.createdAt.toISOString(),
        updatedAt: r.notice.updatedAt.toISOString(),
      })),
    };
  }

  /** Sababli xabar holatini yangilash (Ustoz / Admin tasdiqlashi) */
  async updateStatus(
    actor: RequestUser,
    id: string,
    status: AbsenceNoticeStatus,
  ): Promise<AbsenceNoticeItem> {
    if (actor.role === 'guardian') {
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
    }
    const updated = await this.repo.updateStatus(id, status);
    if (!updated) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    }
    const studentName = await this.findStudentName(updated.studentId);
    return {
      id: updated.id,
      branchId: updated.branchId,
      studentId: updated.studentId,
      studentName,
      guardianUserId: updated.guardianUserId,
      guardianName: '—',
      date: updated.date,
      reason: updated.reason,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
