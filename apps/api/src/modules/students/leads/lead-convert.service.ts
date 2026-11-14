import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { ConvertLeadRequest, LeadDto } from '@lg/contracts';
import type { LeadRow } from '@lg/db';
import { canConvertLead } from '@lg/domain';
import type { AuditContext } from '../../../common/audit/audit.service.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { EnrollmentsService } from '../enrollments.service.js';
import { StudentsService } from '../students.service.js';
import { LeadsService } from './leads.service.js';

/**
 * Lid kartochkasi + so'rovdagi qiymatlar → o'quvchi. Yuborilgan maydon ustun; telefon — ota-ona
 * kiritilmagan bo'lsa, lid telefoni o'quvchiniki deb olinadi (kiritilgan bo'lsa — ular orqali).
 */
function studentFrom(l: LeadRow, s: ConvertLeadRequest['student']) {
  return {
    ...s,
    fullName: s.fullName ?? l.fullName,
    phone: s.phone !== undefined ? s.phone : s.guardians.length === 0 ? l.phone : null,
    source: s.source !== undefined ? s.source : l.source,
    notes: s.notes !== undefined ? s.notes : l.notes,
  };
}

/**
 * Lid → o'quvchi (T-107, FR-STU-4): o'quvchi kartochkasi (dublikat tekshiruvi bilan, Q-68),
 * ixtiyoriy guruhga yozish (sig'im, T-106) va lid `won` — **bitta tranzaksiya**: biror qadam
 * rad etilsa (dublikat, guruh to'la), hech narsa saqlanmaydi. Ikki marta bosish — lid qulfi.
 */
@Injectable()
export class LeadConvertService {
  constructor(
    @Inject(LeadsService) private readonly leads: LeadsService,
    @Inject(StudentsService) private readonly students: StudentsService,
    @Inject(EnrollmentsService) private readonly enrollments: EnrollmentsService,
  ) {}

  convert(ctx: AuditContext, id: string, input: ConvertLeadRequest): Promise<LeadDto> {
    return this.leads.write({
      ctx,
      action: 'lead.convert',
      id,
      change: async (tx, l) => {
        if (!canConvertLead(l.status))
          throw new AppException(HttpStatus.CONFLICT, 'LEAD_CLOSED', { status: l.status });
        const student = await this.students.create(ctx, studentFrom(l, input.student), tx);
        if (input.enroll)
          await this.enrollments.enroll(ctx, { studentId: student.id, ...input.enroll }, tx);
        return { status: 'won', studentId: student.id, lostReason: null };
      },
    });
  }
}
