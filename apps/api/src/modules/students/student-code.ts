import { HttpStatus } from '@nestjs/common';
import { students, type Transaction } from '@lg/db';
import { eq, sql } from 'drizzle-orm';
import { AppException } from '../../common/errors/app.exception.js';

/** `students.code` noyobligi (0011). */
export const STUDENT_CODE_UQ = 'students_code_unique';

/**
 * Avtomatik raqam (T-127): identity ketma-ketligidan keyingi **boʻsh** qiymat — yaratuvchi qoʻlda
 * kiritgan raqamlar (masalan 10050) bilan toʻqnashmaslik uchun band qiymatlar oʻtkazib yuboriladi.
 */
export async function nextFreeStudentCode(tx: Transaction): Promise<number> {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const rows = await tx.execute<{ code: string }>(
      sql`select nextval(pg_get_serial_sequence('students', 'code'))::text as code`,
    );
    const code = Number(rows[0]?.code);
    const [taken] = await tx
      .select({ id: students.id })
      .from(students)
      .where(eq(students.code, code));
    if (!taken) return code;
  }
  throw new AppException(HttpStatus.CONFLICT, 'STUDENT_CODE_TAKEN');
}
