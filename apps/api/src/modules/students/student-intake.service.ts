import { Inject, Injectable } from '@nestjs/common';
import type { CreateStudentRequest, StudentDetail } from '@lg/contracts';
import type { Database } from '@lg/db';
import type { z } from 'zod';
import { type AuditContext } from '../../common/audit/audit.service.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { EnrollmentsService } from './enrollments.service.js';
import { StudentsService } from './students.service.js';

type Input = z.output<typeof CreateStudentRequest>;

/**
 * Q-97: o'quvchi + (ixtiyoriy) guruhga yozish — bitta tranzaksiya. Yozish xato bersa (guruh to'la,
 * sana) — o'quvchi ham yaratilmaydi: Mini App'da "yarim qo'shilgan" o'quvchi qolmaydi.
 */
@Injectable()
export class StudentIntakeService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(StudentsService) private readonly students: StudentsService,
    @Inject(EnrollmentsService) private readonly enrollments: EnrollmentsService,
  ) {}

  create(ctx: AuditContext, input: Input): Promise<StudentDetail> {
    const { enrollment, ...student } = input;
    if (!enrollment) return this.students.create(ctx, student);
    return this.db.transaction(async (tx) => {
      const detail = await this.students.create(ctx, student, tx);
      await this.enrollments.enroll(ctx, { studentId: detail.id, ...enrollment }, tx);
      return detail;
    });
  }
}
