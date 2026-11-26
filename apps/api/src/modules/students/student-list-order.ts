import type { StudentSort } from '@lg/contracts';
import { students } from '@lg/db';
import { asc, desc, type SQL, sql } from 'drizzle-orm';

/**
 * Ro'yxat tartibi va keyset cursor (T-177): har tartibda (kalit, id) juftligi — sahifalar
 * takrorlanmaydi va tushib qolmaydi. `after` — oldingi sahifaning oxirgi o'quvchisi.
 */
export const STUDENT_ORDER: Record<StudentSort, { by: SQL[]; after: (id: string) => SQL }> = {
  newest: {
    by: [desc(students.createdAt), desc(students.id)],
    after: (id) =>
      sql`(${students.createdAt}, ${students.id}) < (select s.created_at, s.id from ${students} s where s.id = ${id}::uuid)`,
  },
  name: {
    by: [asc(students.fullName), asc(students.id)],
    after: (id) =>
      sql`(${students.fullName}, ${students.id}) > (select s.full_name, s.id from ${students} s where s.id = ${id}::uuid)`,
  },
  code: {
    by: [asc(students.code), asc(students.id)],
    after: (id) =>
      sql`(${students.code}, ${students.id}) > (select s.code, s.id from ${students} s where s.id = ${id}::uuid)`,
  },
};
